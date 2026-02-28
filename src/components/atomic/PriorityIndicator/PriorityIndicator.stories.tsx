import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PriorityIndicator from './PriorityIndicator';

const meta: Meta<typeof PriorityIndicator> = {
  title: 'Atomic Design/Atomic/PriorityIndicator',
  component: PriorityIndicator,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof PriorityIndicator>;

export const Critical: Story = { args: { priority: 1 } };
export const High: Story = { args: { priority: 2 } };
export const Medium: Story = { args: { priority: 3 } };
export const Low: Story = { args: { priority: 4 } };
export const Minimal: Story = { args: { priority: 5 } };

export const AllPriorities: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {([1, 2, 3, 4, 5] as const).map((p) => (
        <div key={p} className="flex items-center gap-3">
          <span className="w-8 font-mono text-sm">P{p}</span>
          <PriorityIndicator priority={p} />
        </div>
      ))}
    </div>
  ),
};
