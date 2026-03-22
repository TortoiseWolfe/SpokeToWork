'use client';

/**
 * Public worker profile — /worker?id=<uuid>
 * Anon-accessible. Only renders if the worker has ≥1 skill tag (discoverability policy).
 */
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const WorkerProfileInner = dynamic(
  () => import('./WorkerProfileInner').then((m) => m.WorkerProfileInner),
  { ssr: false }
);

export default function WorkerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <WorkerProfileInner />
    </Suspense>
  );
}
