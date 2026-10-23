import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ChunkLoadRecovery from './ChunkLoadRecovery';

const meta: Meta<typeof ChunkLoadRecovery> = {
  title: 'Atomic Design/Atomic/ChunkLoadRecovery',
  component: ChunkLoadRecovery,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div>
        <Story />
        <p>ChunkLoadRecovery renders nothing (null)</p>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChunkLoadRecovery>;

export const Default: Story = {};