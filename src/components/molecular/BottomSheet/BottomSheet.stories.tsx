import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BottomSheet } from './BottomSheet';

const meta: Meta<typeof BottomSheet> = {
  title: 'Molecular/BottomSheet',
  component: BottomSheet,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
};
export default meta;

type Story = StoryObj<typeof BottomSheet>;

const DemoContent = () => (
  <ul className="space-y-2">
    {Array.from({ length: 30 }, (_, i) => (
      <li key={i} className="bg-base-200 rounded p-3">
        Row {i + 1}
      </li>
    ))}
  </ul>
);

export const Peek: Story = {
  render: () => (
    <div className="from-primary/20 to-secondary/20 relative h-screen bg-gradient-to-b">
      <BottomSheet initialSnap="peek" ariaLabel="Demo">
        <DemoContent />
      </BottomSheet>
    </div>
  ),
};

export const Half: Story = {
  render: () => (
    <div className="from-primary/20 to-secondary/20 relative h-screen bg-gradient-to-b">
      <BottomSheet initialSnap="half" ariaLabel="Demo">
        <DemoContent />
      </BottomSheet>
    </div>
  ),
};
