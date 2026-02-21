import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HowItWorksSection from './HowItWorksSection';

const meta = {
  title: 'Atomic Design/Organism/HowItWorksSection',
  component: HowItWorksSection,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HowItWorksSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
