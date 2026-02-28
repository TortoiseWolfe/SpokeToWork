import Link from 'next/link';
import FeatureSpotlight from '@/components/molecular/FeatureSpotlight';
import {
  IsometricBicycle,
  IsometricDesk,
  IsometricCalendar,
  IsometricChat,
} from '@/components/atomic/illustrations';

export interface FeaturesSectionProps {
  className?: string;
}

const secondaryFeatures = [
  {
    title: 'Track Companies',
    description:
      'Organize your target employers, track contacts, and manage your pipeline.',
    href: '/companies',
    Illustration: IsometricDesk,
  },
  {
    title: 'Schedule Visits',
    description:
      'Keep a calendar of upcoming interviews, follow-ups, and deadlines.',
    href: '/schedule',
    Illustration: IsometricCalendar,
  },
  {
    title: 'Stay Connected',
    description:
      'Message hiring managers and get real-time updates on your applications.',
    href: '/messages',
    Illustration: IsometricChat,
  },
  {
    title: 'Manage Your Team',
    description:
      'Build your roster, set weekly schedules, and track applicants from one dashboard.',
    href: '/employer',
    Illustration: IsometricCalendar,
  },
];

/**
 * FeaturesSection — 2-tier layout: Plan Routes spotlight above 3-col grid.
 * @category organisms
 */
export default function FeaturesSection({
  className = '',
}: FeaturesSectionProps) {
  return (
    <section aria-label="Features" className={`py-8 sm:py-10 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">Features</h2>
        <div className="mb-6">
          <FeatureSpotlight
            title="Plan Routes"
            description="Map bicycle-friendly routes between interviews and drop-offs."
            href="/map"
            ctaLabel="Open the Map"
            illustration={<IsometricBicycle className="w-48 md:w-56" />}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {secondaryFeatures.map(
            ({ title, description, href, Illustration }) => (
              <Link
                key={title}
                href={href}
                aria-label={title}
                className="card bg-base-100 border-base-300 hover:border-primary focus-visible:ring-primary min-h-11 border transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="card-body items-center text-center">
                  <Illustration className="mb-2 w-24" aria-hidden />
                  <h3 className="card-title text-base-content">{title}</h3>
                  <p className="text-base-content/75 text-sm">{description}</p>
                </div>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
