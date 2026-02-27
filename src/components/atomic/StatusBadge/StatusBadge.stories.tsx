import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import StatusBadge from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/Atomic/StatusBadge',
  component: StatusBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'text' },
    className: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Applied: Story = { args: { status: 'applied' } };
export const Screening: Story = { args: { status: 'screening' } };
export const Interviewing: Story = { args: { status: 'interviewing' } };
export const Offer: Story = { args: { status: 'offer' } };
export const Closed: Story = { args: { status: 'closed' } };
export const UnknownFallback: Story = { args: { status: 'archived' } };

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {[
        'applied',
        'screening',
        'interviewing',
        'offer',
        'closed',
        'unknown',
      ].map((s) => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100 rounded p-4">
          <div className="mb-2 text-xs opacity-60">{theme}</div>
          <div className="flex flex-wrap gap-2">
            {[
              'applied',
              'screening',
              'interviewing',
              'offer',
              'closed',
              'unknown',
            ].map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
