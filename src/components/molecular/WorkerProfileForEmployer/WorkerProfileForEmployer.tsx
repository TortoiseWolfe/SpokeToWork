'use client';

import { useWorkerProfileForEmployer } from '@/hooks/useWorkerProfileForEmployer';
import { useResumeDownload } from '@/hooks/useResumeDownload';

export interface WorkerProfileForEmployerProps {
  workerId: string;
  viewerId: string;
}

export function WorkerProfileForEmployer({
  workerId,
  viewerId,
}: WorkerProfileForEmployerProps) {
  const { data, isLoading, error } = useWorkerProfileForEmployer(
    workerId,
    viewerId
  );
  const { download, isDownloading } = useResumeDownload();

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-8"
        role="status"
        aria-label="Loading profile"
      >
        <span
          className="loading loading-spinner loading-md"
          aria-hidden="true"
        />
        <span className="sr-only">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        <span>Failed to load profile: {error.message}</span>
      </div>
    );
  }

  if (!data || !data.profile) {
    return null;
  }

  const { profile, resume_access, resume, access_reason } = data;

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <div className="avatar">
              <div className="w-12 rounded-full">
                <img
                  src={profile.avatar_url}
                  alt={`${profile.display_name} avatar`}
                />
              </div>
            </div>
          ) : (
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content w-12 rounded-full">
                <span className="text-lg">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
          <h3 className="card-title">{profile.display_name}</h3>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-base-content/70 mt-2">{profile.bio}</p>
        )}

        {/* Resume access section */}
        <div className="mt-4">
          {resume_access === 'none' && (
            <p className="text-base-content/60 text-sm italic">
              This worker&apos;s resume is private.
            </p>
          )}

          {resume_access === 'download' && resume && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{resume.label}</span>
                {access_reason === 'applied_to_your_company' && (
                  <span className="badge badge-info badge-sm">
                    Shared via application
                  </span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={isDownloading}
                  onClick={() =>
                    download(resume.storage_path, resume.file_name)
                  }
                  aria-label={`Download ${resume.label}`}
                >
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
