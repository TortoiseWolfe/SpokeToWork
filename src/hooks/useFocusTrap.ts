'use client';

/**
 * useFocusTrap — WAI-ARIA modal focus containment.
 *
 * On activate (active: false → true):
 *   – remember document.activeElement
 *   – move focus into the container (first tabbable, else the container
 *     itself if it has tabindex)
 * While active:
 *   – Tab at the last tabbable wraps to the first; Shift+Tab at the
 *     first wraps to the last
 * On deactivate (active: true → false or unmount):
 *   – restore focus to the remembered element if it's still in the DOM
 *
 * No Escape handling — the trap is purely about Tab containment. Callers
 * decide what "close" means and flip `active` themselves.
 */

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean
): void {
  const restoreRef = useRef<HTMLElement | null>(null);

  // Save / enter / restore — driven by `active` transitions.
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;

    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const [first] = tabbables(root);
    (first ?? root).focus({ preventScroll: true });

    return () => {
      const prev = restoreRef.current;
      if (prev && prev.isConnected) prev.focus({ preventScroll: true });
      restoreRef.current = null;
    };
    // ref is a stable object; re-run only on active toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Tab wrap — bound while active.
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = tabbables(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey) {
        if (current === first || !root.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !root.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
