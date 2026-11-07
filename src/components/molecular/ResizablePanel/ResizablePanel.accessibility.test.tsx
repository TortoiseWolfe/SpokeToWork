import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ResizablePanel from './ResizablePanel';

expect.extend(toHaveNoViolations);

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(0);
  return 1;
});

vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock window.innerWidth for mobile detection
let mockWindowWidth = 1024;
Object.defineProperty(window, 'innerWidth', {
  get: () => mockWindowWidth,
  configurable: true,
});

describe('ResizablePanel Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockWindowWidth = 1024;
  });

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('resize handle has correct separator role', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByRole('separator');
    expect(handle).toBeInTheDocument();
  });

  it('resize handle is keyboard focusable', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();
    expect(document.activeElement).toBe(handle);
  });

  it('resize handle has aria-orientation for screen readers', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByRole('separator');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('resize handle has aria-valuenow reflecting current width', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByRole('separator');
    expect(handle).toHaveAttribute('aria-valuenow', '280');
  });

  it('resize handle has aria-valuemin and aria-valuemax', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByRole('separator');
    expect(handle).toHaveAttribute('aria-valuemin', '200');
    expect(handle).toHaveAttribute('aria-valuemax', '400');
  });

  it('resize handle has descriptive aria-label', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByRole('separator');
    expect(handle).toHaveAttribute('aria-label', 'Resize sidebar');
  });

  it('allows custom aria-label for resize handle', () => {
    render(
      <ResizablePanel
        data-testid="panel"
        resizeHandleLabel="Adjust sidebar width"
      >
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByRole('separator');
    expect(handle).toHaveAttribute('aria-label', 'Adjust sidebar width');
  });
});

describe('ResizablePanel Keyboard Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockWindowWidth = 1024;
  });

  it('supports ArrowRight to increase width', () => {
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    expect(onWidthChange).toHaveBeenCalledWith(290);
  });

  it('supports ArrowLeft to decrease width', () => {
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });

    expect(onWidthChange).toHaveBeenCalledWith(270);
  });

  it('supports Home key to go to minimum width', () => {
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'Home' });

    expect(onWidthChange).toHaveBeenCalledWith(200);
  });

  it('supports End key to go to maximum width', () => {
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'End' });

    expect(onWidthChange).toHaveBeenCalledWith(400);
  });

  it('respects minimum bound when using ArrowLeft', () => {
    // Start at minimum width
    mockLocalStorage.setItem(
      'spoketowork:sidebar-preferences',
      JSON.stringify({ width: 200 })
    );

    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });

    // Should stay at minimum
    expect(onWidthChange).toHaveBeenCalledWith(200);
  });

  it('respects maximum bound when using ArrowRight', () => {
    // Start at maximum width
    mockLocalStorage.setItem(
      'spoketowork:sidebar-preferences',
      JSON.stringify({ width: 400 })
    );

    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    // Should stay at maximum
    expect(onWidthChange).toHaveBeenCalledWith(400);
  });
});

describe('ResizablePanel Mobile Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockWindowWidth = 600; // Mobile viewport
  });

  it('does not render resize handle on mobile for cleaner interface', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    // Trigger mobile detection
    act(() => {
      fireEvent(window, new Event('resize'));
    });

    // Handle should not be rendered
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('content remains accessible on mobile', async () => {
    const { container } = render(
      <ResizablePanel data-testid="panel">
        <div>Accessible content</div>
      </ResizablePanel>
    );

    // Trigger mobile detection
    act(() => {
      fireEvent(window, new Event('resize'));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ResizablePanel Focus Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockWindowWidth = 1024;
  });

  it('maintains focus on resize handle after keyboard interaction', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(handle);
  });

  it('children can receive focus separately from resize handle', () => {
    render(
      <ResizablePanel data-testid="panel">
        <button data-testid="child-button">Click me</button>
      </ResizablePanel>
    );

    const button = screen.getByTestId('child-button');
    button.focus();

    expect(document.activeElement).toBe(button);
  });
});
