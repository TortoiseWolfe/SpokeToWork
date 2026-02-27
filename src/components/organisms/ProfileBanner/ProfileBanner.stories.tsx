import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ProfileBanner from './ProfileBanner';

const meta: Meta<typeof ProfileBanner> = {
  title: 'Atomic Design/Organisms/ProfileBanner',
  component: ProfileBanner,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    displayName: 'Maya Chen',
    email: 'maya@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
    provider: null,
    role: 'worker',
    joinedAt: '2025-06-15T10:30:00Z',
    actions: (
      <a href="#settings" className="btn btn-primary min-h-11">
        Settings
      </a>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OAuthEmployer: Story = {
  args: {
    displayName: 'Elena Employer',
    email: 'elena@velo-works.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    provider: 'Google',
    role: 'employer',
    joinedAt: '2024-01-10T00:00:00Z',
  },
};

export const NoAvatar: Story = {
  args: {
    avatarUrl: null,
    provider: 'Github',
  },
};

export const Minimal: Story = {
  args: {
    avatarUrl: null,
    role: null,
    actions: undefined,
  },
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100">
          <div className="px-4 py-1 text-xs opacity-60">{theme}</div>
          <ProfileBanner {...args} />
        </div>
      ))}
    </div>
  ),
};
