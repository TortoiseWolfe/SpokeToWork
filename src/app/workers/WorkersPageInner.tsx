'use client';

import { useEffect, useState } from 'react';
import { SkillFilter } from '@/components/molecular/SkillFilter';
import { WorkerCard } from '@/components/molecular/WorkerCard';
import { useWorkersSkillFilter } from '@/hooks/useWorkersSkillFilter';
import { getDiscoverableWorkers } from '@/lib/workers/worker-service';
import type { DiscoverableWorker } from '@/types/worker';

export function WorkersPageInner() {
  const { skillIds, setSkillIds, skillTree, resolveSkill, workerFilters } =
    useWorkersSkillFilter();

  const [workers, setWorkers] = useState<DiscoverableWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const data = await getDiscoverableWorkers(workerFilters);
        if (!cancelled) setWorkers(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workerFilters]);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Workers</h1>
        <p className="text-base-content/70 mt-1">Find workers by trade</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <SkillFilter
          tree={skillTree}
          selected={skillIds}
          onChange={setSkillIds}
        />
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error.message}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : workers.length === 0 ? (
        <p className="text-base-content/60 py-12 text-center">No workers found.</p>
      ) : (
        <ul className="space-y-3">
          {workers.map((w) => (
            <li key={w.id}>
              <WorkerCard worker={w} resolveSkill={resolveSkill} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
