import React from 'react';
import ApplicationCard from '@/components/molecular/ApplicationCard';
import type { ApplicationCardApp } from '@/components/molecular/ApplicationCard';

export interface StatusColumnProps {
  status: string;
  label: string;
  applications: ApplicationCardApp[];
  onAdvance: (applicationId: string, interviewDate?: string) => void;
  onReject: (applicationId: string) => void;
  updatingId?: string | null;
  className?: string;
}

export default function StatusColumn({
  status,
  label,
  applications,
  onAdvance,
  onReject,
  updatingId = null,
  className = '',
}: StatusColumnProps) {
  return (
    <section
      aria-label={`${label} applications`}
      className={`bg-base-200 flex min-w-[280px] flex-col rounded-lg p-3 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-base-content font-semibold">{label}</h3>
        <span className="badge badge-sm">{applications.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {applications.length === 0 ? (
          <p className="text-base-content/50 py-4 text-center text-sm">
            No applications
          </p>
        ) : (
          applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onAdvance={onAdvance}
              onReject={onReject}
              updating={updatingId === app.id}
            />
          ))
        )}
      </div>
    </section>
  );
}
