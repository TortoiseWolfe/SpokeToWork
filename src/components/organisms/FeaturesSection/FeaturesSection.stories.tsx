import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FeaturesSection from './FeaturesSection';

const meta = {
  title: 'Atomic Design/Organism/FeaturesSection',
  component: FeaturesSection,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FeaturesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
