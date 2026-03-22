'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SkillBadge } from '@/components/atomic/SkillBadge';
import type { DiscoverableWorker } from '@/types/worker';
import type { ResolvedSkill } from '@/types/worker';

export interface WorkerCardProps {
  worker: DiscoverableWorker;
  resolveSkill: (id: string) => ResolvedSkill | null;
}

export function WorkerCard({ worker, resolveSkill }: WorkerCardProps) {
  const displayName = worker.display_name ?? worker.username ?? 'Worker';
  const primarySkill = worker.primary_skill_id
    ? resolveSkill(worker.primary_skill_id)
    : null;

  return (
    <Link
      href={`/worker?id=${worker.id}`}
      className="card bg-base-100 hover:bg-base-200 flex flex-row items-center gap-4 p-4 shadow transition-colors"
      data-testid="worker-card"
    >
      {worker.avatar_url ? (
        <Image
          src={worker.avatar_url}
          alt={displayName}
          width={48}
          height={48}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="bg-base-300 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold">
          {displayName[0]?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{displayName}</p>
        {worker.bio && (
          <p className="text-base-content/70 line-clamp-1 text-sm">{worker.bio}</p>
        )}
        {primarySkill && (
          <div className="mt-1">
            <SkillBadge skill={primarySkill} />
          </div>
        )}
      </div>
    </Link>
  );
}
