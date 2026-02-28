import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RouteHeroIllustration } from './RouteHeroIllustration';

const meta: Meta<typeof RouteHeroIllustration> = {
  title: 'Atomic Design/Atomic/RouteHeroIllustration',
  component: RouteHeroIllustration,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'w-80',
  },
};

export const Animated: Story = {
  args: {
    className: 'w-80',
    animated: true,
  },
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100 rounded p-4">
          <div className="mb-2 text-xs opacity-60">{theme}</div>
          <RouteHeroIllustration className="w-80" />
        </div>
      ))}
    </div>
  ),
};
