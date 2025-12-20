'use client';

/**
 * ResizablePanel - Feature 047: Route Sidebar UX (US5)
 *
 * A panel that can be resized by dragging its right edge.
 * Width is persisted to localStorage and restored on mount.
 *
 * Features:
 * - Drag right edge to resize (FR-007)
 * - Width persists in localStorage (FR-008)
 * - Min/max constraints: 200px-400px (NFR-002)
 * - Smooth 60fps resize with requestAnimationFrame (NFR-001)
 * - Disabled on mobile < 768px (FR-009)
 *
 * @see specs/047-route-sidebar-ux/spec.md
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  getSidebarWidth,
  setSidebarWidth,
  SIDEBAR_DEFAULTS,
} from '@/lib/storage/sidebar-preferences';

export interface ResizablePanelProps {
  /** Content to render inside the panel */
  children: ReactNode;
  /** Called when width changes during resize */
  onWidthChange?: (width: number) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** aria-label for the resize handle */
  resizeHandleLabel?: string;
  /** Test ID for the component */
  'data-testid'?: string;
}

/**
 * Debounce localStorage writes to reduce disk I/O during active resizing.
 * Writes happen at most every 100ms.
 */
const SAVE_DEBOUNCE_MS = 100;

export default function ResizablePanel({
  children,
  onWidthChange,
  className = '',
  resizeHandleLabel = 'Resize sidebar',
  'data-testid': testId,
}: ResizablePanelProps) {
  // Initialize from localStorage, fallback to default
  const [width, setWidth] = useState<number>(SIDEBAR_DEFAULTS.WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Load saved width on mount
  useEffect(() => {
    setWidth(getSidebarWidth());
  }, []);

  // Check for mobile viewport (disable resize on mobile)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save to localStorage with debounce
  const saveWidth = useCallback((newWidth: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSidebarWidth(newWidth);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle pointer move during resize
  const handlePointerMove = useCallback(
    (e: globalThis.PointerEvent) => {
      if (!isResizing) return;

      // Use requestAnimationFrame for smooth 60fps updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const delta = e.clientX - startXRef.current;
        const newWidth = Math.min(
          Math.max(startWidthRef.current + delta, SIDEBAR_DEFAULTS.MIN_WIDTH),
          SIDEBAR_DEFAULTS.MAX_WIDTH
        );

        setWidth(newWidth);
        onWidthChange?.(newWidth);
        saveWidth(newWidth);
      });
    },
    [isResizing, onWidthChange, saveWidth]
  );

  // Handle pointer up to end resize
  const handlePointerUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Final save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSidebarWidth(width);
  }, [width]);

  // Add/remove global listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizing, handlePointerMove, handlePointerUp]);

  // Start resize on pointer down
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return;

    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    // Set cursor for entire document during resize
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle keyboard resize for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isMobile) return;

    const STEP = 10; // 10px per key press
    let newWidth = width;

    switch (e.key) {
      case 'ArrowLeft':
        newWidth = Math.max(width - STEP, SIDEBAR_DEFAULTS.MIN_WIDTH);
        break;
      case 'ArrowRight':
        newWidth = Math.min(width + STEP, SIDEBAR_DEFAULTS.MAX_WIDTH);
        break;
      case 'Home':
        newWidth = SIDEBAR_DEFAULTS.MIN_WIDTH;
        break;
      case 'End':
        newWidth = SIDEBAR_DEFAULTS.MAX_WIDTH;
        break;
      default:
        return;
    }

    e.preventDefault();
    setWidth(newWidth);
    onWidthChange?.(newWidth);
    setSidebarWidth(newWidth);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex ${className}`}
      style={{ width: isMobile ? undefined : `${width}px` }}
      data-testid={testId}
    >
      {/* Panel content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Resize handle - hidden on mobile */}
      {!isMobile && (
        <div
          className={`hover:bg-primary/30 absolute top-0 right-0 z-10 h-full w-1 cursor-ew-resize bg-transparent transition-colors duration-150 ${isResizing ? 'bg-primary/50' : ''} `}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          role="separator"
          aria-orientation="vertical"
          aria-label={resizeHandleLabel}
          aria-valuenow={width}
          aria-valuemin={SIDEBAR_DEFAULTS.MIN_WIDTH}
          aria-valuemax={SIDEBAR_DEFAULTS.MAX_WIDTH}
          tabIndex={0}
          data-testid={testId ? `${testId}-handle` : 'resize-handle'}
        >
          {/* Visual grip indicator on hover/focus */}
          <div
            className={`bg-base-content/20 absolute top-1/2 left-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${isResizing ? 'opacity-100' : ''} `}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
