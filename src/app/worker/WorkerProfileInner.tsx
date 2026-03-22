'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SkillBadge } from '@/components/atomic/SkillBadge';
import { useSkills } from '@/hooks/useSkills';
import { getWorkerById } from '@/lib/workers/worker-service';
import type { DiscoverableWorker } from '@/types/worker';

export function WorkerProfileInner() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') ?? null;
  const { resolve } = useSkills();

  const [worker, setWorker] = useState<DiscoverableWorker | null>(null);
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
      try {
        const data = await getWorkerById(id);
        if (cancelled) return;
        if (!data) setNotFound(true);
        else setWorker(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
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

  if (notFound || !worker) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Worker not found</h1>
        <p className="text-base-content/70 mt-2">
          This worker may not be discoverable or no longer exists.
        </p>
        <Link href="/workers" className="btn btn-primary mt-6">Browse workers</Link>
      </div>
    );
  }

  const displayName = worker.display_name ?? worker.username ?? 'Worker';
  const resolvedSkills = worker.user_skills
    .map((us) => resolve(us.skill_id))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-start gap-6">
        {worker.avatar_url ? (
          <Image
            src={worker.avatar_url}
            alt={displayName}
            width={80}
            height={80}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="bg-base-300 flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          {worker.username && (
            <p className="text-base-content/60 text-sm">@{worker.username}</p>
          )}
        </div>
      </header>

      {worker.bio && (
        <section className="mb-8">
          <p className="text-base-content/80">{worker.bio}</p>
        </section>
      )}

      {resolvedSkills.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Trades</h2>
          <div className="flex flex-wrap gap-2">
            {resolvedSkills.map((skill) => (
              <SkillBadge key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        <Link href="/workers" className="btn btn-ghost btn-sm">
          ← Back to workers
        </Link>
      </div>
    </main>
  );
}
