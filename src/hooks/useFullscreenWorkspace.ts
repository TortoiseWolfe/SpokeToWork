'use client';

/**
 * useFullscreenWorkspace
 *
 * Extracted from CompaniesPageInner. Measures the nav, sets an explicit
 * viewport-minus-nav height on the workspace container, hides the footer,
 * and locks <html> overflow so the split-pane workspace owns all scrolling.
 *
 * Bypasses the fragile `h-full` parent chain that breaks when any ancestor
 * is `display: contents` or has padding.
 */

import { useEffect, type RefObject } from 'react';

export function useFullscreenWorkspace(
  containerRef: RefObject<HTMLElement | null>,
  /**
   * When false (e.g. during loading) the container isn't mounted, so the
   * effect is a no-op. Pass the negation of your loading guard.
   */
  active: boolean
): void {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const nav =
      document.querySelector('nav') ?? document.querySelector('header');
    const navH = nav ? nav.getBoundingClientRect().height : 0;
    el.style.height = `calc(100dvh - ${navH}px)`;

    const prevHtmlOv = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const footer = document.querySelector<HTMLElement>('footer');
    const prevFooter = footer?.style.display ?? '';
    if (footer) footer.style.display = 'none';

    return () => {
      el.style.height = '';
      document.documentElement.style.overflow = prevHtmlOv;
      if (footer) footer.style.display = prevFooter;
    };
  }, [containerRef, active]);
}

export default useFullscreenWorkspace;
