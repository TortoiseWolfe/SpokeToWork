import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import TeamPanel from './TeamPanel';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Elena Employer',
    avatar_url: null,
    joined_at: '2026-01-01T00:00:00Z',
  },
  {
    user_id: 'u2',
    display_name: 'Tara Teammate',
    avatar_url: null,
    joined_at: '2026-01-05T00:00:00Z',
  },
  {
    user_id: 'u3',
    display_name: 'Pat Part-Time',
    avatar_url: null,
    joined_at: '2026-02-01T00:00:00Z',
  },
];

const connections = [
  { user_id: 'c1', display_name: 'Nadia Networker', avatar_url: null },
  { user_id: 'c2', display_name: 'Raj Reviewer', avatar_url: null },
];

const meta: Meta<typeof TeamPanel> = {
  title: 'Atomic Design/Molecular/TeamPanel',
  component: TeamPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    currentUserId: 'u1',
    onRemove: async () => {},
    onAdd: async () => {},
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { members, availableConnections: connections },
};

export const Empty: Story = {
  args: {
    members: [members[0]],
    availableConnections: connections,
  },
};

export const NoConnectionsToAdd: Story = {
  args: { members, availableConnections: [] },
};

const themes = ['spoketowork-light', 'spoketowork-dark', 'synthwave'] as const;

export const ThemeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-base-100 rounded p-4">
          <div className="mb-2 text-xs opacity-60">{theme}</div>
          <TeamPanel
            members={members}
            availableConnections={connections}
            currentUserId="u1"
            onRemove={async () => {}}
            onAdd={async () => {}}
          />
        </div>
      ))}
    </div>
  ),
};
