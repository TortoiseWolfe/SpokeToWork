'use client';

import Link from 'next/link';

export interface CTAFooterProps {
  className?: string;
}

/**
 * CTAFooter - Closing call-to-action section with sign-up link
 *
 * @category organisms
 */
export default function CTAFooter({ className = '' }: CTAFooterProps) {
  return (
    <section
      aria-label="Call to action"
      className={`px-4 py-16 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Ready to ride?</h2>
        <p className="text-base-content/80 mt-4 text-lg">
          Start planning your job search route today.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="btn btn-primary btn-lg min-h-11 min-w-11"
          >
            Get Started
          </Link>
          <Link
            href="/sign-up?role=employer"
            className="btn btn-outline btn-lg min-h-11 min-w-11"
          >
            Hiring cyclists? Post jobs →
          </Link>
        </div>
      </div>
    </section>
  );
}
