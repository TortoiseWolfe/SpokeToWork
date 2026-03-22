'use client';

/**
 * Public company profile — /company?id=<uuid>
 *
 * Static export (next.config.ts output: 'export') can't generateStaticParams
 * for dynamic DB data, so this is a client page that reads ?id from the URL
 * and fetches via anon Supabase client. No auth required.
 */
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CompanyProfileInner = dynamic(
  () => import('./CompanyProfileInner').then((m) => m.CompanyProfileInner),
  { ssr: false }
);

export default function CompanyProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <CompanyProfileInner />
    </Suspense>
  );
}
