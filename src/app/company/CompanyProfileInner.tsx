'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useIndustries } from '@/hooks/useIndustries';
import { BADGE_CLASS } from '@/lib/industries/badge-class';
import type { CompanyIndustry } from '@/types/company';

interface PublicCompany {
  id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  is_verified: boolean;
}

interface PublicLocation {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
}

export function CompanyProfileInner() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') ?? null;
  const { resolve } = useIndustries();

  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [industries, setIndustries] = useState<CompanyIndustry[]>([]);
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Cast to untyped SupabaseClient: shared_companies and company_locations
      // are not yet in the generated Database type, but they exist in the DB.
      const sb = createClient() as unknown as SupabaseClient;
      const [companyRes, junctionRes, locRes] = await Promise.all([
        sb.from('shared_companies').select('id,name,website,careers_url,is_verified').eq('id', id).maybeSingle(),
        sb.from('company_industries').select('*').eq('shared_company_id', id),
        sb.from('company_locations').select('id,address,latitude,longitude').eq('shared_company_id', id),
      ]);
      if (cancelled) return;
      if (!companyRes.data) {
        setNotFound(true);
      } else {
        // Partial render is acceptable for a public page, but don't swallow
        // the reason silently — a column-name typo hid here once already.
        if (junctionRes.error) console.error('company profile: industries fetch failed', junctionRes.error);
        if (locRes.error) console.error('company profile: locations fetch failed', locRes.error);
        setCompany(companyRes.data as PublicCompany);
        setIndustries((junctionRes.data ?? []) as CompanyIndustry[]);
        setLocations((locRes.data ?? []) as PublicLocation[]);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Company not found</h1>
        <p className="text-base-content/70 mt-2">
          This company may be private or no longer exists.
        </p>
        <Link href="/" className="btn btn-primary mt-6">Go home</Link>
      </div>
    );
  }

  const resolved = industries
    .map((ci) => resolve(ci.industry_id))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const primary = industries.find((ci) => ci.is_primary);
  const primaryResolved = primary ? resolve(primary.industry_id) : null;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-bold">{company.name}</h1>
          {company.is_verified && (
            <span className="badge badge-success badge-lg">Verified</span>
          )}
        </div>
        {primaryResolved && (
          <p className="text-base-content/70 mt-1 text-sm">
            {primaryResolved.ancestry.join(' › ')}
          </p>
        )}
      </header>

      {resolved.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Industries</h2>
          <div className="flex flex-wrap gap-2">
            {resolved.map((r) => (
              <span
                key={r.id}
                data-testid="industry-badge"
                className={`badge badge-lg ${BADGE_CLASS[r.color]}`}
              >
                {r.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {(company.website || company.careers_url) && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Links</h2>
          <div className="flex flex-wrap gap-2">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                Website
              </a>
            )}
            {company.careers_url && (
              <a href={company.careers_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                Careers
              </a>
            )}
          </div>
        </section>
      )}

      {locations.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Locations</h2>
          <ul className="space-y-2">
            {locations.map((loc) => (
              <li key={loc.id} className="rounded-box bg-base-200 p-4">
                {loc.address}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
