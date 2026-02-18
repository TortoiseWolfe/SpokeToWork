import { useRef, useCallback, useState } from 'react';

export type Orientation = 'horizontal' | 'vertical' | 'both';

export interface UseRovingTabIndexOptions {
  /** Number of items in the group */
  itemCount: number;
  /** Arrow key orientation: horizontal (Left/Right), vertical (Up/Down), or both */
  orientation?: Orientation;
  /** Whether navigation wraps around from last to first and vice versa */
  loop?: boolean;
  /** Initially active index (default: 0) */
  initialIndex?: number;
  /** Callback when active index changes */
  onActiveIndexChange?: (index: number) => void;
  /** Indices that should be skipped (disabled items) */
  disabledIndices?: number[];
}

export interface ItemProps {
  tabIndex: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
  ref: (el: HTMLElement | null) => void;
  'data-roving-index': number;
}

/**
 * useRovingTabIndex - WAI-ARIA roving tabindex pattern
 *
 * Manages focus within a group of focusable elements (tabs, radio buttons,
 * listbox options). Only the active item has tabIndex=0; all others have
 * tabIndex=-1. Arrow keys, Home, and End move focus between items.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex
 */
export function useRovingTabIndex({
  itemCount,
  orientation = 'horizontal',
  loop = true,
  initialIndex = 0,
  onActiveIndexChange,
  disabledIndices = [],
}: UseRovingTabIndexOptions) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const isDisabled = useCallback(
    (index: number) => disabledIndices.includes(index),
    [disabledIndices]
  );

  /**
   * Find the next enabled index in a given direction.
   * Returns -1 if no enabled index is found.
   */
  const findNextEnabled = useCallback(
    (current: number, direction: 1 | -1): number => {
      let next = current + direction;

      for (let i = 0; i < itemCount; i++) {
        if (loop) {
          next = ((next % itemCount) + itemCount) % itemCount;
        } else if (next < 0 || next >= itemCount) {
          return current;
        }

        if (!isDisabled(next)) {
          return next;
        }

        next += direction;
      }

      return current;
    },
    [itemCount, loop, isDisabled]
  );

  const findFirstEnabled = useCallback((): number => {
    for (let i = 0; i < itemCount; i++) {
      if (!isDisabled(i)) return i;
    }
    return 0;
  }, [itemCount, isDisabled]);

  const findLastEnabled = useCallback((): number => {
    for (let i = itemCount - 1; i >= 0; i--) {
      if (!isDisabled(i)) return i;
    }
    return itemCount - 1;
  }, [itemCount, isDisabled]);

  const moveTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      onActiveIndexChange?.(index);
      const el = itemRefs.current.get(index);
      if (el) {
        el.focus();
      }
    },
    [onActiveIndexChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const prevKeys =
        orientation === 'vertical'
          ? ['ArrowUp']
          : orientation === 'horizontal'
            ? ['ArrowLeft']
            : ['ArrowUp', 'ArrowLeft'];

      const nextKeys =
        orientation === 'vertical'
          ? ['ArrowDown']
          : orientation === 'horizontal'
            ? ['ArrowRight']
            : ['ArrowDown', 'ArrowRight'];

      if (prevKeys.includes(event.key)) {
        event.preventDefault();
        moveTo(findNextEnabled(activeIndex, -1));
      } else if (nextKeys.includes(event.key)) {
        event.preventDefault();
        moveTo(findNextEnabled(activeIndex, 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveTo(findFirstEnabled());
      } else if (event.key === 'End') {
        event.preventDefault();
        moveTo(findLastEnabled());
      }
    },
    [
      orientation,
      activeIndex,
      moveTo,
      findNextEnabled,
      findFirstEnabled,
      findLastEnabled,
    ]
  );

  const getItemProps = useCallback(
    (index: number): ItemProps => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: handleKeyDown,
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
      'data-roving-index': index,
    }),
    [activeIndex, handleKeyDown]
  );

  return {
    activeIndex,
    setActiveIndex: moveTo,
    getItemProps,
  };
}
