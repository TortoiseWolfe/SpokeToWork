import Link from 'next/link';
import type { ReactNode } from 'react';

export interface FeatureSpotlightProps {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  /** Illustration rendered left of content on desktop, above on mobile. */
  illustration: ReactNode;
  className?: string;
}

/**
 * Full-width feature card with horizontal layout (illustration left, content right).
 * Stacks vertically on mobile. Used to spotlight the primary feature above the 3-col grid.
 */
export default function FeatureSpotlight({
  title,
  description,
  href,
  ctaLabel,
  illustration,
  className = '',
}: FeatureSpotlightProps) {
  return (
    <div
      className={`card bg-base-200 border-base-300 border shadow-sm ${className}`}
    >
      <div className="card-body flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex justify-center md:w-1/3" aria-hidden="true">
          {illustration}
        </div>
        <div className="flex flex-col gap-4 md:w-2/3">
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          <p className="text-base-content/80">{description}</p>
          <div>
            <Link href={href} className="btn btn-primary min-h-11 min-w-11">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
