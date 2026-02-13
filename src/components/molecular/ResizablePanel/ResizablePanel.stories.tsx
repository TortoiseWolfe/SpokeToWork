import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ResizablePanel from './ResizablePanel';

const meta: Meta<typeof ResizablePanel> = {
  title: 'Molecular/ResizablePanel',
  component: ResizablePanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
A panel that can be resized by dragging its right edge.
Width persists to localStorage and is restored on mount.

## Features
- **Drag to resize**: Click and drag the right edge to resize (FR-007)
- **Persistence**: Width is saved to localStorage (FR-008)
- **Constraints**: Width is clamped to 200px-400px (NFR-002)
- **Smooth resize**: Uses requestAnimationFrame for 60fps updates (NFR-001)
- **Mobile-friendly**: Resize is disabled on screens < 768px (FR-009)
- **Keyboard support**: Arrow keys, Home, and End for accessibility

## Usage
\`\`\`tsx
<ResizablePanel onWidthChange={(width) => console.log(width)}>
  <YourSidebarContent />
</ResizablePanel>
\`\`\`
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex h-screen">
        <Story />
        <div className="bg-base-100 flex-1 p-4">
          <p className="text-base-content/60">Main content area</p>
          <p className="text-base-content/40 mt-2 text-sm">
            Drag the right edge of the panel to resize it.
            <br />
            The width persists in localStorage.
          </p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResizablePanel>;

/**
 * Default resizable panel with sample content
 */
export const Default: Story = {
  args: {
    children: (
      <div className="bg-base-200 h-full p-4">
        <h2 className="text-lg font-semibold">Sidebar</h2>
        <p className="text-base-content/60 mt-2">
          Drag the right edge to resize this panel.
        </p>
        <ul className="menu mt-4">
          <li>
            <a>Item 1</a>
          </li>
          <li>
            <a>Item 2</a>
          </li>
          <li>
            <a>Item 3</a>
          </li>
        </ul>
      </div>
    ),
    'data-testid': 'resizable-panel',
  },
};

/**
 * With width change callback
 */
export const WithCallback: Story = {
  args: {
    children: (
      <div className="bg-base-200 h-full p-4">
        <h2 className="text-lg font-semibold">With Callback</h2>
        <p className="text-base-content/60 mt-2">
          Check the console for width change events.
        </p>
      </div>
    ),
    onWidthChange: (width) => console.log('Width changed:', width),
    'data-testid': 'resizable-panel',
  },
  parameters: {
    docs: {
      description: {
        story: 'Logs width changes to the console during resize.',
      },
    },
  },
};

/**
 * With route sidebar content
 */
export const WithRouteSidebar: Story = {
  args: {
    children: (
      <div className="bg-base-200 flex h-full flex-col">
        <div className="border-base-300 border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Routes</h2>
            <button className="btn btn-primary btn-sm">New</button>
          </div>
        </div>
        <ul className="menu flex-1 overflow-y-auto p-2">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <a className={i === 0 ? 'active' : ''}>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: `hsl(${i * 45}, 70%, 50%)` }}
                />
                Route {i + 1}
              </a>
            </li>
          ))}
        </ul>
        <div className="border-base-300 text-base-content/60 border-t p-3 text-sm">
          8 routes
        </div>
      </div>
    ),
    'data-testid': 'route-sidebar',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the ResizablePanel wrapping route sidebar content, as used in Feature 047.',
      },
    },
  },
};

/**
 * Custom resize handle label
 */
export const CustomLabel: Story = {
  args: {
    children: (
      <div className="bg-base-200 h-full p-4">
        <h2 className="text-lg font-semibold">Custom Label</h2>
        <p className="text-base-content/60 mt-2">
          The resize handle has a custom aria-label.
        </p>
      </div>
    ),
    resizeHandleLabel: 'Drag to adjust panel width',
    'data-testid': 'resizable-panel',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how to customize the aria-label for the resize handle.',
      },
    },
  },
};

/**
 * Keyboard navigation
 */
export const KeyboardNavigation: Story = {
  args: {
    children: (
      <div className="bg-base-200 h-full p-4">
        <h2 className="text-lg font-semibold">Keyboard Navigation</h2>
        <p className="text-base-content/60 mt-2">
          Focus the resize handle and use:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>
            <kbd className="kbd kbd-sm">←</kbd> Decrease by 10px
          </li>
          <li>
            <kbd className="kbd kbd-sm">→</kbd> Increase by 10px
          </li>
          <li>
            <kbd className="kbd kbd-sm">Home</kbd> Minimum (200px)
          </li>
          <li>
            <kbd className="kbd kbd-sm">End</kbd> Maximum (400px)
          </li>
        </ul>
      </div>
    ),
    'data-testid': 'resizable-panel',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates keyboard navigation for accessibility. Tab to the resize handle and use arrow keys.',
      },
    },
  },
};

/**
 * Mobile behavior (simulated narrow viewport)
 */
export const MobileBehavior: Story = {
  args: {
    children: (
      <div className="bg-base-200 h-full w-full p-4">
        <h2 className="text-lg font-semibold">Mobile View</h2>
        <p className="text-base-content/60 mt-2">
          On mobile (viewport &lt; 768px), the resize handle is hidden and the
          panel uses full width.
        </p>
        <div className="alert alert-info mt-4">
          <span>
            Resize your browser window to under 768px to see mobile behavior.
          </span>
        </div>
      </div>
    ),
    'data-testid': 'resizable-panel',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story:
          'On mobile viewports, the resize functionality is disabled and the panel uses automatic width.',
      },
    },
  },
};
