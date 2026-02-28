import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ShiftEditorDrawer from './ShiftEditorDrawer';
import type { TeamShift } from '@/types/schedule';
import type { TeamMember } from '@/hooks/useEmployerTeam';

const members: TeamMember[] = [
  {
    user_id: 'u1',
    display_name: 'Alice Chen',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
  {
    user_id: 'u2',
    display_name: 'Bob Ramirez',
    avatar_url: null,
    joined_at: '2026-01-01',
  },
  {
    user_id: 'u3',
    display_name: 'Carol Davis',
    avatar_url: null,
    joined_at: '2026-02-15',
  },
];

const existingShift: TeamShift = {
  id: 's1',
  company_id: 'c1',
  user_id: 'u1',
  display_name: 'Alice Chen',
  avatar_url: null,
  shift_date: '2026-03-02',
  start_time: '09:00:00',
  end_time: '17:00:00',
  shift_type: 'regular',
  notes: 'Front desk coverage',
  created_by: 'u2',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const meta: Meta<typeof ShiftEditorDrawer> = {
  title: 'Atomic Design/Molecular/ShiftEditorDrawer',
  component: ShiftEditorDrawer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ShiftEditorDrawer>;

export const CreateShift: Story = {
  args: {
    shift: null,
    defaultDate: '2026-03-02',
    members,
    onSave: async () => {},
    onClose: () => {},
  },
};

export const EditShift: Story = {
  args: {
    shift: existingShift,
    members,
    onSave: async () => {},
    onDelete: async () => {},
    onClose: () => {},
  },
};

export const Saving: Story = {
  args: {
    shift: existingShift,
    members,
    onSave: async () => {},
    onClose: () => {},
    saving: true,
  },
};
