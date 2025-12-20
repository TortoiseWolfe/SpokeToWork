import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResizablePanel from './ResizablePanel';

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

describe('ResizablePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockWindowWidth = 1024;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children correctly', () => {
    render(
      <ResizablePanel>
        <div data-testid="child">Child content</div>
      </ResizablePanel>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders resize handle on desktop', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    expect(screen.getByTestId('panel-handle')).toBeInTheDocument();
  });

  it('hides resize handle on mobile (< 768px)', () => {
    mockWindowWidth = 600;

    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    // Trigger resize check
    act(() => {
      fireEvent(window, new Event('resize'));
    });

    expect(screen.queryByTestId('panel-handle')).not.toBeInTheDocument();
  });

  it('initializes with default width', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveStyle({ width: '280px' });
  });

  it('loads saved width from localStorage', () => {
    mockLocalStorage.setItem(
      'spoketowork:sidebar-preferences',
      JSON.stringify({ width: 350 })
    );

    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveStyle({ width: '350px' });
  });

  it('resize handle has correct aria attributes', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-label', 'Resize sidebar');
    expect(handle).toHaveAttribute('aria-valuenow', '280');
    expect(handle).toHaveAttribute('aria-valuemin', '200');
    expect(handle).toHaveAttribute('aria-valuemax', '400');
    expect(handle).toHaveAttribute('tabindex', '0');
  });

  it('starts resize operation on pointer down', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');

    // Start resize
    act(() => {
      fireEvent.pointerDown(handle, { clientX: 280 });
    });

    // Verify resize is active via cursor change
    expect(document.body.style.cursor).toBe('ew-resize');
    expect(document.body.style.userSelect).toBe('none');
  });

  it('respects minimum width constraint (200px) via keyboard', () => {
    const onWidthChange = vi.fn();

    // Start at minimum width
    mockLocalStorage.setItem(
      'spoketowork:sidebar-preferences',
      JSON.stringify({ width: 200 })
    );

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    // Try to decrease further
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });

    // Should stay at minimum
    expect(onWidthChange).toHaveBeenCalledWith(200);
  });

  it('respects maximum width constraint (400px) via keyboard', () => {
    const onWidthChange = vi.fn();

    // Start at maximum width
    mockLocalStorage.setItem(
      'spoketowork:sidebar-preferences',
      JSON.stringify({ width: 400 })
    );

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    // Try to increase further
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    });

    // Should stay at maximum
    expect(onWidthChange).toHaveBeenCalledWith(400);
  });

  it('saves width to localStorage after resize ends', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');

    // Start and complete resize
    act(() => {
      fireEvent.pointerDown(handle, { clientX: 280 });
    });

    act(() => {
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 320,
        bubbles: true,
      });
      document.dispatchEvent(moveEvent);
    });

    act(() => {
      const upEvent = new PointerEvent('pointerup', { bubbles: true });
      document.dispatchEvent(upEvent);
    });

    // Advance timers past debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('supports keyboard resize with ArrowRight', () => {
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    // ArrowRight should increase width by 10px
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    });

    expect(onWidthChange).toHaveBeenCalledWith(290);
  });

  it('supports keyboard resize with ArrowLeft', () => {
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    handle.focus();

    // ArrowLeft should decrease width by 10px
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });

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

    act(() => {
      fireEvent.keyDown(handle, { key: 'Home' });
    });

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

    act(() => {
      fireEvent.keyDown(handle, { key: 'End' });
    });

    expect(onWidthChange).toHaveBeenCalledWith(400);
  });

  it('applies custom className', () => {
    render(
      <ResizablePanel data-testid="panel" className="custom-class">
        <div>Content</div>
      </ResizablePanel>
    );

    expect(screen.getByTestId('panel')).toHaveClass('custom-class');
  });

  it('allows custom resize handle label', () => {
    render(
      <ResizablePanel data-testid="panel" resizeHandleLabel="Drag to resize">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');
    expect(handle).toHaveAttribute('aria-label', 'Drag to resize');
  });

  it('sets cursor to ew-resize during drag', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');

    act(() => {
      fireEvent.pointerDown(handle, { clientX: 280 });
    });

    expect(document.body.style.cursor).toBe('ew-resize');
  });

  it('resets cursor after drag ends', () => {
    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    const handle = screen.getByTestId('panel-handle');

    act(() => {
      fireEvent.pointerDown(handle, { clientX: 280 });
    });

    act(() => {
      const upEvent = new PointerEvent('pointerup', { bubbles: true });
      document.dispatchEvent(upEvent);
    });

    expect(document.body.style.cursor).toBe('');
  });

  it('does not respond to resize on mobile', () => {
    mockWindowWidth = 600;
    const onWidthChange = vi.fn();

    render(
      <ResizablePanel data-testid="panel" onWidthChange={onWidthChange}>
        <div>Content</div>
      </ResizablePanel>
    );

    // Trigger mobile detection
    act(() => {
      fireEvent(window, new Event('resize'));
    });

    // Panel should not have fixed width on mobile
    const panel = screen.getByTestId('panel');
    expect(panel.style.width).toBeFalsy();
  });
});

describe('ResizablePanel edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockWindowWidth = 1024;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles invalid localStorage data gracefully', () => {
    mockLocalStorage.setItem('spoketowork:sidebar-preferences', 'invalid json');

    render(
      <ResizablePanel data-testid="panel">
        <div>Content</div>
      </ResizablePanel>
    );

    // Should fall back to default width
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveStyle({ width: '280px' });
  });

  it('handles localStorage exceptions gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    // Should not throw
    expect(() => {
      render(
        <ResizablePanel data-testid="panel">
          <div>Content</div>
        </ResizablePanel>
      );
    }).not.toThrow();
  });
});
