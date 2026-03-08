import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SplitWorkspaceLayout } from './SplitWorkspaceLayout';

const meta: Meta<typeof SplitWorkspaceLayout> = {
  title: 'Templates/SplitWorkspaceLayout',
  component: SplitWorkspaceLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Device-gated split. Desktop/tablet get a two-column grid; mobile gets full-screen map + sheet overlay. Branch is on useDeviceType category, not a CSS breakpoint — so this story shows whichever layout matches your current viewport + touch.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SplitWorkspaceLayout>;

const SlotBox = ({
  label,
  color,
}: {
  label: string;
  color: 'primary' | 'secondary' | 'accent';
}) => (
  <div
    className={`flex h-full w-full items-center justify-center bg-${color}/10 text-${color} font-bold`}
  >
    {label}
  </div>
);

export const Default: Story = {
  render: () => (
    <div className="h-screen">
      <SplitWorkspaceLayout
        table={<SlotBox label="TABLE SLOT" color="primary" />}
        map={<SlotBox label="MAP SLOT" color="secondary" />}
        mobileSheet={
          <div className="bg-base-100 fixed right-0 bottom-0 left-0 h-48 p-4 shadow-lg">
            <SlotBox label="MOBILE SHEET SLOT" color="accent" />
          </div>
        }
      />
    </div>
  ),
};
