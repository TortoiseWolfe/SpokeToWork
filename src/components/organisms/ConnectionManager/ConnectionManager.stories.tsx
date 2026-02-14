import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ConnectionManager from './ConnectionManager';

const meta: Meta<typeof ConnectionManager> = {
  title: 'Atomic Design/Organism/ConnectionManager',
  component: ConnectionManager,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
