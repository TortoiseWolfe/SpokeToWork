import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ViewModeToggle from './ViewModeToggle';

const meta: Meta<typeof ViewModeToggle> = {
  title: 'Atomic Design/Atomic/ViewModeToggle',
  component: ViewModeToggle,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ViewModeToggle>;

export const TableActive: Story = {
  args: { value: 'table', onChange: () => {} },
};

export const KanbanActive: Story = {
  args: { value: 'kanban', onChange: () => {} },
};
