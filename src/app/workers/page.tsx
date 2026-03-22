'use client';

/**
 * Public workers list — /workers
 *
 * Anon-accessible. Only shows discoverable workers (those with ≥1 skill tag).
 * Static export safe: client-side fetch, no generateStaticParams needed.
 */
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const WorkersPageInner = dynamic(
  () => import('./WorkersPageInner').then((m) => m.WorkersPageInner),
  { ssr: false }
);

export default function WorkersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <WorkersPageInner />
    </Suspense>
  );
}
