/**
 * Unit Tests for useRovingTabIndex
 *
 * Tests the WAI-ARIA roving tabindex pattern implementation
 * including arrow key navigation, Home/End, wrapping, and disabled items.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRovingTabIndex } from '../useRovingTabIndex';

describe('useRovingTabIndex', () => {
  describe('initialization', () => {
    it('should default activeIndex to 0', () => {
      const { result } = renderHook(() => useRovingTabIndex({ itemCount: 3 }));
      expect(result.current.activeIndex).toBe(0);
    });

    it('should respect initialIndex', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({ itemCount: 3, initialIndex: 2 })
      );
      expect(result.current.activeIndex).toBe(2);
    });
  });

  describe('getItemProps', () => {
    it('should set tabIndex=0 for active item and -1 for others', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({ itemCount: 3, initialIndex: 1 })
      );

      expect(result.current.getItemProps(0).tabIndex).toBe(-1);
      expect(result.current.getItemProps(1).tabIndex).toBe(0);
      expect(result.current.getItemProps(2).tabIndex).toBe(-1);
    });

    it('should include data-roving-index attribute', () => {
      const { result } = renderHook(() => useRovingTabIndex({ itemCount: 3 }));

      expect(result.current.getItemProps(0)['data-roving-index']).toBe(0);
      expect(result.current.getItemProps(2)['data-roving-index']).toBe(2);
    });

    it('should provide a ref callback', () => {
      const { result } = renderHook(() => useRovingTabIndex({ itemCount: 3 }));

      const props = result.current.getItemProps(0);
      expect(typeof props.ref).toBe('function');
    });
  });

  describe('horizontal navigation', () => {
    it('should move to next item on ArrowRight', () => {
      const onActiveIndexChange = vi.fn();
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'horizontal',
          onActiveIndexChange,
        })
      );

      // Create a mock element and register it
      const mockEl = document.createElement('button');
      const focusSpy = vi.spyOn(mockEl, 'focus');
      act(() => {
        result.current.getItemProps(1).ref(mockEl);
      });

      // Simulate ArrowRight keydown
      act(() => {
        const event = {
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(1);
      expect(onActiveIndexChange).toHaveBeenCalledWith(1);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should move to previous item on ArrowLeft', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'horizontal',
          initialIndex: 2,
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(1).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(2).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(1);
    });

    it('should NOT respond to ArrowUp/Down in horizontal mode', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'horizontal',
        })
      );

      act(() => {
        const event = {
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('vertical navigation', () => {
    it('should move to next item on ArrowDown', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'vertical',
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(1).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(1);
    });

    it('should move to previous item on ArrowUp', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'vertical',
          initialIndex: 1,
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(0).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(1).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('wrapping (loop)', () => {
    it('should wrap from last to first when loop=true', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'horizontal',
          initialIndex: 2,
          loop: true,
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(0).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(2).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(0);
    });

    it('should wrap from first to last when loop=true', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'horizontal',
          initialIndex: 0,
          loop: true,
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(2).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(2);
    });

    it('should NOT wrap when loop=false', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 3,
          orientation: 'horizontal',
          initialIndex: 2,
          loop: false,
        })
      );

      act(() => {
        const event = {
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(2).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(2);
    });
  });

  describe('Home and End keys', () => {
    it('should move to first item on Home', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 5,
          initialIndex: 3,
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(0).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'Home',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(3).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(0);
    });

    it('should move to last item on End', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 5,
          initialIndex: 1,
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(4).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'End',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(1).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(4);
    });
  });

  describe('disabled items', () => {
    it('should skip disabled items when navigating forward', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 4,
          orientation: 'horizontal',
          initialIndex: 0,
          disabledIndices: [1],
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(2).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(2);
    });

    it('should skip disabled items when navigating backward', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 4,
          orientation: 'horizontal',
          initialIndex: 2,
          disabledIndices: [1],
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(0).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(2).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(0);
    });

    it('should skip disabled first item on Home', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 4,
          initialIndex: 3,
          disabledIndices: [0],
        })
      );

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(1).ref(mockEl);
      });

      act(() => {
        const event = {
          key: 'Home',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(3).onKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(1);
    });
  });

  describe('both orientation', () => {
    it('should respond to all four arrow keys', () => {
      const { result } = renderHook(() =>
        useRovingTabIndex({
          itemCount: 5,
          orientation: 'both',
          initialIndex: 2,
        })
      );

      // Register mock elements
      for (let i = 0; i < 5; i++) {
        const el = document.createElement('button');
        act(() => {
          result.current.getItemProps(i).ref(el);
        });
      }

      // ArrowRight should advance
      act(() => {
        const event = {
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(2).onKeyDown(event);
      });
      expect(result.current.activeIndex).toBe(3);

      // ArrowDown should also advance
      act(() => {
        const event = {
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(3).onKeyDown(event);
      });
      expect(result.current.activeIndex).toBe(4);
    });
  });

  describe('preventDefault', () => {
    it('should call preventDefault on handled keys', () => {
      const { result } = renderHook(() => useRovingTabIndex({ itemCount: 3 }));

      const mockEl = document.createElement('button');
      act(() => {
        result.current.getItemProps(1).ref(mockEl);
      });

      const preventDefault = vi.fn();
      act(() => {
        const event = {
          key: 'ArrowRight',
          preventDefault,
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(preventDefault).toHaveBeenCalled();
    });

    it('should NOT call preventDefault on unhandled keys', () => {
      const { result } = renderHook(() => useRovingTabIndex({ itemCount: 3 }));

      const preventDefault = vi.fn();
      act(() => {
        const event = {
          key: 'Tab',
          preventDefault,
        } as unknown as React.KeyboardEvent;
        result.current.getItemProps(0).onKeyDown(event);
      });

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });
});
