'use client';

import Link from 'next/link';
import { LayeredSpokeToWorkLogo } from '@/components/atomic/SpinningLogo';
import { AnimatedLogo } from '@/components/atomic/AnimatedLogo';
import { detectedConfig } from '@/config/project-detected';
import { useEffect } from 'react';

export default function Home() {
  // Apply overflow-hidden only on desktop (screens >= 768px)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      document.body.style.overflow = isMobile ? '' : 'hidden';
    };

    // Set initial state
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="from-base-200 via-base-100 to-base-200 flex h-[calc(100vh-10rem)] flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-br">
      {/* Skip to main content for accessibility - mobile-first touch target (PRP-017 T036) */}
      <a
        href="#main-content"
        className="btn btn-sm btn-primary sr-only min-h-11 min-w-11 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>

      {/* Hero Section - Mobile-first responsive padding (PRP-017 T036) */}
      <section
        id="main-content"
        aria-label="Welcome hero"
        className="hero relative flex-1"
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

              {/* Subtitle - cleaner mobile text */}
              <p className="text-base-content mb-6 text-base leading-relaxed font-medium sm:mb-6 sm:text-xl sm:leading-normal md:text-2xl">
                Progressive Web App for in-person job hunting.
                <br />
                <span className="mt-1 block">
                  Track companies and generate optimized bicycle routes.
                </span>
              </p>

              {/* Features - hide on smallest screens */}
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

              {/* Primary Actions - mobile-first touch targets (PRP-017 T036) */}
              <nav
                aria-label="Primary navigation"
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
              >
                <Link
                  href="/blog"
                  className="btn btn-accent btn-md group md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Read Blog
                </Link>
                {/* Storybook link disabled - 404
                <a
                  href="https://TortoiseWolfe.github.io/SpokeToWork/storybook/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-md group md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
                >
                  <svg
                    className="mr-2 h-5 w-5 transition-transform group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                  View Storybook
                </a>
                */}
                <Link
                  href="/themes"
                  className="btn btn-secondary btn-md group md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
                >
                  <svg
                    className="mr-2 h-5 w-5 transition-transform group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  Browse Themes
                </Link>
              </nav>

              {/* Quick Links - vertical stack on mobile, horizontal on desktop */}
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
                  •
                </span>
                <Link
                  href="/map"
                  className="link link-hover opacity-87 hover:opacity-100 focus:opacity-100"
                >
                  Map
                </Link>
                <span
                  className="hidden opacity-30 sm:inline"
                  aria-hidden="true"
                >
                  •
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
                  •
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

      {/* Feature Cards Section - Mobile-first responsive grid (PRP-017 T036) */}
      <section
        aria-label="Key features"
        className="flex-shrink-0 px-4 py-4 sm:px-6 lg:px-8"
      >
        <div className="container mx-auto">
          <h2 className="sr-only">Key Features</h2>
          <div className="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/companies"
              className="card bg-base-100 focus-within:ring-primary cursor-pointer shadow-md transition-all focus-within:ring-2 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="card-body items-center p-4 text-center">
                <div
                  className="mb-3 text-3xl"
                  role="img"
                  aria-label="Office building"
                >
                  🏢
                </div>
                <h3 className="card-title text-base">Track Companies</h3>
                <p className="text-base-content/70 text-xs">
                  Log applications & follow-ups
                </p>
              </div>
            </Link>

            <Link
              href="/map"
              className="card bg-base-100 focus-within:ring-primary cursor-pointer shadow-md transition-all focus-within:ring-2 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="card-body items-center p-4 text-center">
                <div className="mb-3 text-3xl" role="img" aria-label="Bicycle">
                  🚴
                </div>
                <h3 className="card-title text-base">Plan Routes</h3>
                <p className="text-base-content/70 text-xs">
                  Optimize your job hunt by bike
                </p>
              </div>
            </Link>

            <Link
              href="/schedule"
              className="card bg-base-100 focus-within:ring-primary cursor-pointer shadow-md transition-all focus-within:ring-2 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="card-body items-center p-4 text-center">
                <div className="mb-3 text-3xl" role="img" aria-label="Calendar">
                  📅
                </div>
                <h3 className="card-title text-base">Schedule Visits</h3>
                <p className="text-base-content/70 text-xs">
                  Book interviews & follow-ups
                </p>
              </div>
            </Link>

            <Link
              href="/messages"
              className="card bg-base-100 focus-within:ring-primary cursor-pointer shadow-md transition-all focus-within:ring-2 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="card-body items-center p-4 text-center">
                <div
                  className="mb-3 text-3xl"
                  role="img"
                  aria-label="Speech bubble"
                >
                  💬
                </div>
                <h3 className="card-title text-base">Stay Connected</h3>
                <p className="text-base-content/70 text-xs">
                  Message recruiters & contacts
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
