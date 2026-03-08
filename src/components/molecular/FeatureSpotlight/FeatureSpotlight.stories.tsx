import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FeatureSpotlight from './FeatureSpotlight';
import { IsometricBicycle } from '@/components/atomic/illustrations';

const meta: Meta<typeof FeatureSpotlight> = {
  title: 'Components/Molecular/FeatureSpotlight',
  component: FeatureSpotlight,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const PlanRoutes: Story = {
  args: {
    title: 'Plan Routes',
    description:
      'See every application on a map. Cluster interviews by neighborhood. Know the commute before you commit.',
    href: '/map',
    ctaLabel: 'Open the Map',
    illustration: <IsometricBicycle className="w-48" />,
  },
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100 rounded p-4">
          <div className="mb-2 text-xs opacity-60">{theme}</div>
          <FeatureSpotlight
            title="Plan Routes"
            description="See every application on a map. Cluster interviews by neighborhood. Know the commute before you commit."
            href="/map"
            ctaLabel="Open the Map"
            illustration={<IsometricBicycle className="w-48" />}
          />
        </div>
      ))}
    </div>
  ),
};
