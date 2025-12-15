'use client';

/**
 * useClickOutside Hook
 * FR-007: Consolidated hook for click-outside detection
 *
 * Replaces duplicate event listeners in:
 * - ColorblindToggle.tsx
 * - FontSwitcher.tsx
 * - CompanyDetailDrawer.tsx
 * - RouteDetailDrawer.tsx
 * - TileLayerSelector.tsx
 */

import { useEffect, type RefObject } from 'react';

/**
 * Hook for detecting clicks outside a referenced element
 *
 * @param ref - RefObject pointing to the element to monitor
 * @param handler - Callback function when click outside is detected
 * @param enabled - Whether the listener is active (default: true)
 *
 * @example
 * ```typescript
 * function Dropdown() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   useClickOutside(ref, () => setIsOpen(false), isOpen);
 *
 *   return (
 *     <div ref={ref}>
 *       {isOpen && <DropdownMenu />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler, enabled]);
}

export default useClickOutside;
