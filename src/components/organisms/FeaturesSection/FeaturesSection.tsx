'use client';

import Link from 'next/link';
import {
  IsometricDesk,
  IsometricBicycle,
  IsometricCalendar,
  IsometricChat,
} from '@/components/atomic/illustrations';

export interface FeaturesSectionProps {
  className?: string;
}

const features = [
  {
    title: 'Track Companies',
    description:
      'Organize your target employers, track contacts, and manage your pipeline.',
    href: '/companies',
    Illustration: IsometricDesk,
    accent: false,
  },
  {
    title: 'Plan Routes',
    description:
      'Map bicycle-friendly routes between interviews and drop-offs.',
    href: '/map',
    Illustration: IsometricBicycle,
    accent: true,
  },
  {
    title: 'Schedule Visits',
    description:
      'Keep a calendar of upcoming interviews, follow-ups, and deadlines.',
    href: '/schedule',
    Illustration: IsometricCalendar,
    accent: false,
  },
  {
    title: 'Stay Connected',
    description:
      'Message hiring managers and get real-time updates on your applications.',
    href: '/messages',
    Illustration: IsometricChat,
    accent: false,
  },
];

/**
 * FeaturesSection - Responsive grid of feature cards with isometric illustrations.
 *
 * Replaces the emoji feature cards with professional SVG illustrations.
 * The "Plan Routes" card is visually distinguished with an accent border.
 *
 * @category organisms
 */
export default function FeaturesSection({
  className = '',
}: FeaturesSectionProps) {
  return (
    <section aria-label="Features" className={`py-12 sm:py-16 ${className}`}>
      <h2 className="text-base-content mb-8 text-center text-3xl font-bold sm:mb-12 sm:text-4xl">
        Features
      </h2>

      <div className="grid grid-cols-1 gap-6 px-4 min-[500px]:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {features.map(({ title, description, href, Illustration, accent }) => (
          <Link
            key={title}
            href={href}
            aria-label={title}
            className={`card bg-base-200 shadow-md transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              accent ? 'border-accent border-2' : ''
            }`}
          >
            <div className="card-body items-center text-center">
              <div className="mb-4 flex items-center justify-center">
                <Illustration className="h-24 w-24" />
              </div>
              <h3 className="card-title text-base-content">{title}</h3>
              <p className="text-base-content/70 text-sm">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
