import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AnimatedLogo } from './AnimatedLogo';

const meta: Meta<typeof AnimatedLogo> = {
  title: 'Atomic Design/Atomic/AnimatedLogo',
  component: AnimatedLogo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An animated logo component with hover effects where letters pop up in sequence.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'The text to display in the animated logo',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl'],
      description: 'Size of the logo text',
    },
    animationSpeed: {
      control: 'select',
      options: ['slow', 'normal', 'fast'],
      description: 'Speed of the animation',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AnimatedLogo>;

export const Default: Story = {
  args: {
    text: 'SpokeToWork',
    size: 'xl',
    animationSpeed: 'normal',
  },
};

export const SmallSize: Story = {
  args: {
    text: 'Small Logo',
    size: 'sm',
    animationSpeed: 'normal',
  },
};

export const LargeSize: Story = {
  args: {
    text: 'Big Logo',
    size: '3xl',
    animationSpeed: 'normal',
  },
};

export const SlowAnimation: Story = {
  args: {
    text: 'Slow Motion',
    size: 'xl',
    animationSpeed: 'slow',
  },
};

export const FastAnimation: Story = {
  args: {
    text: 'Fast Motion',
    size: 'xl',
    animationSpeed: 'fast',
  },
};

export const CustomText: Story = {
  args: {
    text: 'Your App Name',
    size: 'xl',
    animationSpeed: 'normal',
  },
};

export const WithCustomClass: Story = {
  args: {
    text: 'Styled Logo',
    size: 'xl',
    animationSpeed: 'normal',
    className: 'text-blue-500',
  },
};

export const LongText: Story = {
  args: {
    text: 'This Is A Really Long Application Name',
    size: 'md',
    animationSpeed: 'normal',
  },
};

export const ThemeComparison: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div
        data-theme="spoketowork-dark"
        className="rounded-box bg-base-100 flex flex-col items-center gap-4 p-8"
      >
        <h3 className="text-base-content text-lg font-semibold">
          spoketowork-dark
        </h3>
        <AnimatedLogo size="xl" />
        <AnimatedLogo size="md" text="Route Your Job Search" />
      </div>
      <div
        data-theme="spoketowork-light"
        className="rounded-box bg-base-100 flex flex-col items-center gap-4 p-8"
      >
        <h3 className="text-base-content text-lg font-semibold">
          spoketowork-light
        </h3>
        <AnimatedLogo size="xl" />
        <AnimatedLogo size="md" text="Route Your Job Search" />
      </div>
    </div>
  ),
};
