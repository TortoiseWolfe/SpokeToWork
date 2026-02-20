import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CTAFooter from './CTAFooter';

const meta = {
  title: 'Atomic Design/Organism/CTAFooter',
  component: CTAFooter,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CTAFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
