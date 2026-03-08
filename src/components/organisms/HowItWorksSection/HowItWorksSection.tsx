'use client';

export interface HowItWorksSectionProps {
  className?: string;
}

const workerSteps = [
  {
    number: '1',
    title: 'Sign Up',
    description: 'Create your account',
  },
  {
    number: '2',
    title: 'Add Companies',
    description: "Track where you've applied",
  },
  {
    number: '3',
    title: 'Plan Your Route',
    description: 'Generate an optimized bicycle route',
  },
];

const employerSteps = [
  {
    number: '1',
    title: 'Sign Up as Employer',
    description: 'Create your employer account',
  },
  {
    number: '2',
    title: 'Build Your Team',
    description: 'Add connections to your roster',
  },
  {
    number: '3',
    title: 'Set Schedules',
    description: 'Assign weekly shifts in one click',
  },
];

/**
 * HowItWorksSection - Dual-path numbered flow for workers and employers.
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
      className={`bg-base-200 py-8 sm:py-10 ${className}`}
    >
      <h2 className="text-base-content mb-6 text-center text-3xl font-bold sm:mb-8 sm:text-4xl">
        How It Works
      </h2>

      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Worker path */}
        <div>
          <p className="text-primary mb-4 text-center text-sm font-semibold tracking-wide uppercase">
            For Job Seekers
          </p>
          <StepRow steps={workerSteps} />
        </div>

        {/* Employer path */}
        <div>
          <p className="text-secondary mb-4 text-center text-sm font-semibold tracking-wide uppercase">
            For Employers
          </p>
          <StepRow steps={employerSteps} />
        </div>
      </div>
    </section>
  );
}

function StepRow({
  steps,
}: {
  steps: { number: string; title: string; description: string }[];
}) {
  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-0">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="flex flex-col items-center md:flex-row"
        >
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
  );
}
