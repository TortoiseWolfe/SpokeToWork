import type { ReactNode } from 'react';
import AvatarDisplay from '@/components/atomic/AvatarDisplay';

export type ProfileRole = 'worker' | 'employer' | 'admin';

export interface ProfileBannerProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  /** OAuth provider display name (e.g. "Google") or null for email+password */
  provider: string | null;
  role: ProfileRole | null;
  /** ISO date string — user.created_at */
  joinedAt: string;
  /** Right-aligned actions (e.g. settings link). Callers supply min-h-11. */
  actions?: ReactNode;
  className?: string;
}

const roleBadgeClass: Record<ProfileRole, string> = {
  worker: 'badge-neutral',
  employer: 'badge-primary',
  admin: 'badge-secondary',
};

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * ProfileBanner — full-width identity band for /profile.
 *
 * Banner + content-rail pattern: this is the banner. Page owns the rail.
 * Props-driven (no hooks) so stories/tests don't need auth context.
 *
 * @category organisms
 */
export default function ProfileBanner({
  displayName,
  email,
  avatarUrl,
  provider,
  role,
  joinedAt,
  actions,
  className = '',
}: ProfileBannerProps) {
  const providerLabel = provider ?? 'Email';
  const joined = formatJoinDate(joinedAt);

  return (
    <header
      className={`border-base-300 bg-base-200 border-b ${className}`}
      data-testid="profile-banner"
    >
      <div className="container mx-auto px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
          {/* Avatar — 2xl = 128px, ring picks up primary in all themes */}
          <AvatarDisplay
            avatarUrl={avatarUrl}
            displayName={displayName}
            size="xl"
            className="ring-primary ring-offset-base-200 rounded-full ring-4 ring-offset-2"
          />

          {/* Identity block */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold md:text-4xl">{displayName}</h1>
            <p className="text-base-content/70 mt-1">{email}</p>

            {/* Meta row: provider · role · joined */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <span className="badge badge-outline badge-sm">
                Signed in with {providerLabel}
              </span>
              {role && (
                <span className={`badge badge-sm ${roleBadgeClass[role]}`}>
                  {role}
                </span>
              )}
              {joined && (
                <span className="text-base-content/60 text-xs">
                  Joined {joined}
                </span>
              )}
            </div>
          </div>

          {/* Actions slot — right-aligned desktop, below on mobile */}
          {actions && (
            <div className="flex gap-2 md:self-center">{actions}</div>
          )}
        </div>
      </div>
    </header>
  );
}
