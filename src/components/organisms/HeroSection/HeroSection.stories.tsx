import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HeroSection from './HeroSection';

const meta = {
  title: 'Atomic Design/Organism/HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithClassName: Story = {
  args: {
    className: 'bg-base-200',
  },
};
