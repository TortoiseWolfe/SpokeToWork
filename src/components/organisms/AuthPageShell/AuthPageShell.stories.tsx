import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AuthPageShell from './AuthPageShell';

const meta: Meta<typeof AuthPageShell> = {
  title: 'Atomic Design/Organism/AuthPageShell',
  component: AuthPageShell,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Sign In</h1>
        <div className="bg-base-300 h-10 rounded" />
        <div className="bg-base-300 h-10 rounded" />
        <div className="bg-primary h-10 rounded" />
      </div>
    ),
  },
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100">
          <div className="px-4 pt-2 text-xs opacity-60">{theme}</div>
          <AuthPageShell>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">Sign In</h1>
              <div className="bg-base-300 h-10 rounded" />
            </div>
          </AuthPageShell>
        </div>
      ))}
    </div>
  ),
};
