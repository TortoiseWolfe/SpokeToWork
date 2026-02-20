'use client';

import Link from 'next/link';
import { LayeredSpokeToWorkLogo } from '@/components/atomic/SpinningLogo';
import { AnimatedLogo } from '@/components/atomic/AnimatedLogo';
import { detectedConfig } from '@/config/project-detected';

export interface HeroSectionProps {
  className?: string;
}

/**
 * HeroSection - Landing page hero with logo, tagline, CTAs, and feature badges
 *
 * @category organisms
 */
export default function HeroSection({ className = '' }: HeroSectionProps) {
  return (
    <section
      id="main-content"
      aria-label="Welcome hero"
      className={`hero relative flex-1 ${className}`}
    >
      <div className="hero-content px-4 py-6 sm:px-6 sm:py-8 md:py-10 lg:px-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-16">
          {/* Logo - responsive sizes */}
          <div className="flex-shrink-0">
            <div className="h-64 w-64 sm:h-72 sm:w-72 md:h-80 md:w-80 lg:h-[450px] lg:w-[450px]">
              <LayeredSpokeToWorkLogo speed="slow" pauseOnHover />
            </div>
          </div>

          {/* Content - stacked below logo on mobile */}
          <div className="max-w-full px-6 text-center sm:max-w-2xl sm:px-6 lg:max-w-4xl lg:px-0 lg:text-left">
            {/* Main Title with Animation */}
            <h1 className="mb-4 sm:mb-6">
              <AnimatedLogo
                text={detectedConfig.projectName}
                className="!text-lg font-bold min-[400px]:!text-xl min-[480px]:!text-2xl sm:!text-5xl md:!text-6xl lg:!text-7xl"
                animationSpeed="normal"
              />
            </h1>

            {/* Tagline */}
            <p className="text-base-content mb-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Route Your Job Search
            </p>

            {/* Subtitle */}
            <p className="text-base-content/85 mb-6 text-base leading-relaxed font-medium sm:mb-6 sm:text-xl sm:leading-normal md:text-2xl">
              Plan bicycle routes, track applications, land the job.
            </p>

            {/* Feature badges - hidden on smallest screens */}
            <div
              className="mb-8 hidden flex-wrap justify-center gap-2 sm:mb-8 sm:flex md:mb-12 lg:justify-start"
              role="list"
              aria-label="Key features"
            >
              <span
                role="listitem"
                className="badge badge-outline badge-sm sm:badge-md"
              >
                Track Applications
              </span>
              <span
                role="listitem"
                className="badge badge-outline badge-sm sm:badge-md"
              >
                Route Planning
              </span>
              <span
                role="listitem"
                className="badge badge-outline badge-sm sm:badge-md"
              >
                Offline Ready
              </span>
              <span
                role="listitem"
                className="badge badge-outline badge-sm sm:badge-md"
              >
                Mobile First
              </span>
            </div>

            {/* Primary Actions - mobile-first touch targets */}
            <nav
              aria-label="Primary navigation"
              className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
            >
              <Link
                href="/sign-up"
                className="btn btn-primary btn-md group md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
              >
                Get Started
              </Link>
              <Link
                href="/map"
                className="btn btn-secondary btn-outline btn-md group md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
              >
                Try the Map
              </Link>
            </nav>

            {/* Secondary navigation links */}
            <nav
              aria-label="Secondary navigation"
              className="mt-8 flex flex-col gap-2 text-sm sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 sm:text-sm md:mt-10 lg:justify-start"
            >
              <Link
                href="/companies"
                className="link link-hover opacity-87 hover:opacity-100 focus:opacity-100"
              >
                Companies
              </Link>
              <span
                className="hidden opacity-30 sm:inline"
                aria-hidden="true"
              >
                &bull;
              </span>
              <Link
                href="/blog"
                className="link link-hover opacity-87 hover:opacity-100 focus:opacity-100"
              >
                Blog
              </Link>
              <span
                className="hidden opacity-30 sm:inline"
                aria-hidden="true"
              >
                &bull;
              </span>
              <Link
                href="/schedule"
                className="link link-hover opacity-87 hover:opacity-100 focus:opacity-100"
              >
                Schedule
              </Link>
              <span
                className="hidden opacity-30 sm:inline"
                aria-hidden="true"
              >
                &bull;
              </span>
              <Link
                href="/contact"
                className="link link-hover opacity-87 hover:opacity-100 focus:opacity-100"
              >
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
