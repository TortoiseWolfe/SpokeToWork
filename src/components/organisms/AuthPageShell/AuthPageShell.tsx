import type { ReactNode } from 'react';
import { RouteHeroIllustration } from '@/components/atomic/illustrations';

export interface AuthPageShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * AuthPageShell — split-layout wrapper for sign-in/sign-up.
 * Desktop: illustration panel left (bg-base-200) / form right (bg-base-100).
 * Mobile: compact illustration header above form.
 *
 * Mirrors HeroSection's layout mechanics so auth pages read as the
 * same app on the dracula side-by-side acceptance check.
 *
 * @category organisms
 */
export default function AuthPageShell({
  children,
  className = '',
}: AuthPageShellProps) {
  return (
    <div className={`flex min-h-screen flex-col md:flex-row ${className}`}>
      {/* Mobile-only compact header */}
      <div className="flex justify-center py-6 md:hidden">
        <RouteHeroIllustration className="w-40" aria-hidden />
      </div>

      {/* Desktop illustration panel */}
      <aside
        className="bg-base-200 hidden items-center justify-center p-12 md:flex md:w-1/2"
        aria-label="Brand illustration"
      >
        <div className="flex flex-col items-center gap-6">
          <RouteHeroIllustration className="w-56" aria-hidden />
          <p className="text-primary text-xl font-semibold">
            Route Your Job Search
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <div className="bg-base-100 flex flex-1 items-center justify-center p-6 md:w-1/2 md:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
