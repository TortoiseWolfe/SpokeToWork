'use client';

export interface HowItWorksSectionProps {
  className?: string;
}

const steps = [
  {
    number: '1',
    title: 'Sign Up',
    description: 'Create your account',
  },
  {
    number: '2',
    title: 'Add Companies',
    description: 'Track where you\'ve applied',
  },
  {
    number: '3',
    title: 'Plan Your Route',
    description: 'Generate an optimized bicycle route',
  },
];

/**
 * HowItWorksSection - Three-step numbered flow explaining the process.
 *
 * Displays steps horizontally on desktop with connecting lines,
 * and vertically stacked on mobile.
 *
 * @category organisms
 */
export default function HowItWorksSection({
  className = '',
}: HowItWorksSectionProps) {
  return (
    <section
      aria-label="How it works"
      className={`bg-base-200 py-12 sm:py-16 ${className}`}
    >
      <h2 className="text-base-content mb-8 text-center text-3xl font-bold sm:mb-12 sm:text-4xl">
        How It Works
      </h2>

      <div className="flex flex-col items-center gap-8 px-4 sm:px-6 md:flex-row md:justify-center md:gap-0 lg:px-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex flex-col items-center md:flex-row">
            {/* Step card */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary text-primary-content mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold">
                {step.number}
              </div>
              <h3 className="text-base-content mb-1 text-lg font-semibold">
                {step.title}
              </h3>
              <p className="text-base-content/70 max-w-48 text-sm">
                {step.description}
              </p>
            </div>

            {/* Connecting line between steps (hidden on mobile and after last step) */}
            {index < steps.length - 1 && (
              <div
                className="bg-primary/30 mx-6 hidden h-0.5 w-16 md:block"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
