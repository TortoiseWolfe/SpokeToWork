'use client';

import Link from 'next/link';
import { AnimatedLogo } from '@/components/atomic/AnimatedLogo';
import { RouteHeroIllustration } from '@/components/atomic/illustrations';
import { detectedConfig } from '@/config/project-detected';

export interface HeroSectionProps {
  className?: string;
}

/**
 * HeroSection - Landing hero: route illustration + headline + tagline + two CTAs.
 * `id="main-content"` is load-bearing — it's the skip-to-content target.
 *
 * @category organisms
 */
export default function HeroSection({ className = '' }: HeroSectionProps) {
  return (
    <section
      id="main-content"
      aria-label="Welcome hero"
      className={`hero bg-base-100 min-h-[60vh] ${className}`}
    >
      <div className="hero-content flex-col gap-8 text-center lg:flex-row lg:gap-16 lg:text-left">
        {/* Route visual — the "reason to exist" */}
        <RouteHeroIllustration
          className="w-64 max-w-full md:w-80 lg:w-96"
          aria-hidden
        />

        <div className="max-w-xl">
          <h1 className="mb-4 sm:mb-6">
            <AnimatedLogo
              text={detectedConfig.projectName}
              className="!text-lg font-bold min-[400px]:!text-xl min-[480px]:!text-2xl sm:!text-5xl md:!text-6xl lg:!text-7xl"
              animationSpeed="normal"
            />
          </h1>

          <p className="text-primary mb-3 text-xl font-semibold md:text-2xl">
            Route Your Job Search
          </p>

          <p className="text-base-content/80 mb-8">
            Plan bicycle routes, track applications, land the job.
          </p>

          <nav
            aria-label="Primary navigation"
            className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link
              href="/sign-up"
              className="btn btn-primary btn-lg min-h-11 min-w-11"
            >
              Get Started
            </Link>
            <Link
              href="/map"
              className="btn btn-outline btn-lg min-h-11 min-w-11"
            >
              Try the Map
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
