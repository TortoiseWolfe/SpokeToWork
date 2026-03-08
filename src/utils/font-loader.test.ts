/**
 * Tests for font-loader.ts
 * Covers dynamic font loading, caching, and DOM manipulation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FontConfig } from './font-types';

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

// Import after mocks - use dynamic import to reset module state
let loadFont: typeof import('./font-loader').loadFont;
let preloadFonts: typeof import('./font-loader').preloadFonts;
let isFontLoaded: typeof import('./font-loader').isFontLoaded;
let getFontLoadStates: typeof import('./font-loader').getFontLoadStates;
let removeFont: typeof import('./font-loader').removeFont;
let clearAllFonts: typeof import('./font-loader').clearAllFonts;
let applyFontToDocument: typeof import('./font-loader').applyFontToDocument;
let getCurrentFontFromDocument: typeof import('./font-loader').getCurrentFontFromDocument;
let preloadCriticalFonts: typeof import('./font-loader').preloadCriticalFonts;

describe('font-loader', () => {
  // Mock DOM elements
  let mockLinks: HTMLLinkElement[];
  let mockDocumentHead: {
    appendChild: ReturnType<typeof vi.fn>;
  };
  let mockDocumentElementStyle: {
    setProperty: ReturnType<typeof vi.fn>;
  };
  let mockComputedStyle: {
    getPropertyValue: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLinks = [];

    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'link') {
          const link = {
            rel: '',
            href: '',
            as: '',
            onload: null as (() => void) | null,
            onerror: null as (() => void) | null,
            setAttribute: vi.fn((name: string, value: string) => {
              (link as Record<string, unknown>)[
                `data-${name.replace('data-', '')}`
              ] = value;
            }),
            getAttribute: vi.fn((name: string) => {
              return (link as Record<string, unknown>)[name] || null;
            }),
            remove: vi.fn(() => {
              const index = mockLinks.indexOf(
                link as unknown as HTMLLinkElement
              );
              if (index > -1) mockLinks.splice(index, 1);
            }),
          };
          mockLinks.push(link as unknown as HTMLLinkElement);
          return link as unknown as HTMLLinkElement;
        }
        return document.createElement(tagName);
      }
    );

    // Mock document.querySelector
    vi.spyOn(document, 'querySelector').mockImplementation(
      (selector: string) => {
        if (selector.includes('data-font-id')) {
          const fontId = selector.match(/data-font-id="([^"]+)"/)?.[1];
          return (
            mockLinks.find(
              (link) =>
                (link as unknown as Record<string, unknown>)['data-font-id'] ===
                fontId
            ) || null
          );
        }
        return null;
      }
    );

    // Mock document.querySelectorAll
    vi.spyOn(document, 'querySelectorAll').mockImplementation(
      (selector: string) => {
        if (selector === 'link[data-font-id]') {
          return mockLinks as unknown as NodeListOf<Element>;
        }
        return [] as unknown as NodeListOf<Element>;
      }
    );

    // Mock document.head.appendChild
    mockDocumentHead = {
      appendChild: vi.fn((element: HTMLLinkElement) => {
        // Simulate async font loading
        setTimeout(() => {
          if (element.onload) element.onload(new Event('load'));
        }, 10);
        return element;
      }),
    };
    Object.defineProperty(document, 'head', {
      value: mockDocumentHead,
      configurable: true,
    });

    // Mock document.documentElement.style
    mockDocumentElementStyle = {
      setProperty: vi.fn(),
    };
    Object.defineProperty(document.documentElement, 'style', {
      value: mockDocumentElementStyle,
      configurable: true,
    });

    // Mock getComputedStyle
    mockComputedStyle = {
      getPropertyValue: vi.fn().mockReturnValue(''),
    };
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      mockComputedStyle as unknown as CSSStyleDeclaration
    );

    // Mock document.fonts
    Object.defineProperty(document, 'fonts', {
      value: {
        ready: Promise.resolve(),
      },
      configurable: true,
    });

    // Reset the module to clear internal state
    vi.resetModules();
    const fontLoaderModule = await import('./font-loader');
    loadFont = fontLoaderModule.loadFont;
    preloadFonts = fontLoaderModule.preloadFonts;
    isFontLoaded = fontLoaderModule.isFontLoaded;
    getFontLoadStates = fontLoaderModule.getFontLoadStates;
    removeFont = fontLoaderModule.removeFont;
    clearAllFonts = fontLoaderModule.clearAllFonts;
    applyFontToDocument = fontLoaderModule.applyFontToDocument;
    getCurrentFontFromDocument = fontLoaderModule.getCurrentFontFromDocument;
    preloadCriticalFonts = fontLoaderModule.preloadCriticalFonts;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // Helper to create a font config
  function createFontConfig(overrides: Partial<FontConfig> = {}): FontConfig {
    return {
      id: 'test-font',
      name: 'Test Font',
      stack: 'Test Font, sans-serif',
      category: 'sans-serif',
      description: 'A test font',
      ...overrides,
    };
  }

  // =========================================================================
  // loadFont() Tests
  // =========================================================================

  describe('loadFont()', () => {
    it('skips loading for system fonts', async () => {
      const config = createFontConfig({ loading: 'system' });

      await loadFont(config);

      expect(mockDocumentHead.appendChild).not.toHaveBeenCalled();
    });

    it('loads font via link element', async () => {
      const config = createFontConfig({
        id: 'inter',
        url: 'https://fonts.googleapis.com/css2?family=Inter',
      });

      await loadFont(config);

      expect(mockDocumentHead.appendChild).toHaveBeenCalled();
      const link = mockLinks[0];
      expect(link.rel).toBe('stylesheet');
      expect(link.href).toBe('https://fonts.googleapis.com/css2?family=Inter');
    });

    it('uses default URL if not provided in config', async () => {
      const config = createFontConfig({ id: 'inter' });

      await loadFont(config);

      const link = mockLinks[0];
      expect(link.href).toContain('fonts.googleapis.com');
    });

    it('marks font as loaded if no URL available', async () => {
      const config = createFontConfig({ id: 'unknown-font' });

      await loadFont(config);

      expect(isFontLoaded('unknown-font')).toBe(true);
      expect(mockDocumentHead.appendChild).not.toHaveBeenCalled();
    });

    it('does not reload already loaded fonts', async () => {
      const config = createFontConfig({ id: 'inter' });

      await loadFont(config);
      await loadFont(config);

      expect(mockDocumentHead.appendChild).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent load requests', async () => {
      const config = createFontConfig({
        id: 'jetbrains',
        url: 'https://example.com/jetbrains.css',
      });

      // Don't trigger onload immediately to keep font in loading state
      mockDocumentHead.appendChild.mockImplementation(
        (element: HTMLLinkElement) => {
          return element;
        }
      );

      // Start two loads concurrently
      const promise1 = loadFont(config);
      const promise2 = loadFont(config);

      // Both should be promises
      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);

      // Only one link should have been created (deduplication)
      expect(mockDocumentHead.appendChild).toHaveBeenCalledTimes(1);

      // Trigger onload to resolve
      if (mockLinks[0]?.onload) mockLinks[0].onload(new Event('load'));
      await Promise.all([promise1, promise2]);
    });

    it('handles font load error gracefully', async () => {
      const config = createFontConfig({
        id: 'broken-font',
        url: 'https://example.com/broken.css',
      });

      // Simulate error
      mockDocumentHead.appendChild.mockImplementation(
        (element: HTMLLinkElement) => {
          setTimeout(() => {
            if (element.onerror)
              element.onerror(new Event('error') as unknown as string);
          }, 10);
          return element;
        }
      );

      await loadFont(config);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load font, falling back to system font',
        { fontName: 'Test Font' }
      );
      // Font should still be marked as loaded to prevent retries
      expect(isFontLoaded('broken-font')).toBe(true);
    });

    it('handles timeout after 5 seconds', async () => {
      vi.useFakeTimers();
      const config = createFontConfig({
        id: 'slow-font',
        url: 'https://example.com/slow.css',
      });

      // Don't trigger onload or onerror
      mockDocumentHead.appendChild.mockImplementation(
        (element: HTMLLinkElement) => {
          return element;
        }
      );

      const loadPromise = loadFont(config);

      // Advance time past the timeout
      await vi.advanceTimersByTimeAsync(5001);
      await loadPromise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Font loading timeout, continuing anyway',
        { fontName: 'Test Font' }
      );
      vi.useRealTimers();
    });

    it('skips loading if link already exists in document', async () => {
      const config = createFontConfig({ id: 'existing-font' });

      // Simulate existing link in document
      vi.spyOn(document, 'querySelector').mockImplementation(
        (selector: string) => {
          if (selector.includes('existing-font')) {
            return { remove: vi.fn() } as unknown as Element;
          }
          return null;
        }
      );

      await loadFont(config);

      // Should not append new link
      expect(mockDocumentHead.appendChild).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // preloadFonts() Tests
  // =========================================================================

  describe('preloadFonts()', () => {
    it('loads multiple fonts in parallel', async () => {
      const configs = [
        createFontConfig({ id: 'inter', url: 'https://example.com/inter.css' }),
        createFontConfig({
          id: 'jetbrains',
          url: 'https://example.com/jetbrains.css',
        }),
      ];

      await preloadFonts(configs);

      expect(mockDocumentHead.appendChild).toHaveBeenCalledTimes(2);
    });

    it('returns array of results', async () => {
      const configs = [
        createFontConfig({ id: 'font1', loading: 'system' }),
        createFontConfig({ id: 'font2', loading: 'system' }),
      ];

      const results = await preloadFonts(configs);

      expect(results).toHaveLength(2);
    });
  });

  // =========================================================================
  // isFontLoaded() Tests
  // =========================================================================

  describe('isFontLoaded()', () => {
    it('returns false for unloaded font', () => {
      expect(isFontLoaded('not-loaded')).toBe(false);
    });

    it('returns true for loaded font', async () => {
      // Use a font with URL to actually trigger loading
      const config = createFontConfig({
        id: 'loaded-font',
        url: 'https://example.com/font.css',
      });
      await loadFont(config);

      expect(isFontLoaded('loaded-font')).toBe(true);
    });
  });

  // =========================================================================
  // getFontLoadStates() Tests
  // =========================================================================

  describe('getFontLoadStates()', () => {
    it('returns idle status for unknown fonts', () => {
      const states = getFontLoadStates(['unknown']);

      expect(states.get('unknown')).toEqual({
        id: 'unknown',
        status: 'idle',
      });
    });

    it('returns loaded status for loaded fonts', async () => {
      // Use a font with URL to actually trigger loading
      await loadFont(
        createFontConfig({ id: 'test', url: 'https://example.com/test.css' })
      );

      const states = getFontLoadStates(['test']);

      expect(states.get('test')?.status).toBe('loaded');
      expect(states.get('test')?.loadedAt).toBeDefined();
    });

    it('returns loading status for fonts being loaded', async () => {
      const config = createFontConfig({
        id: 'loading-font',
        url: 'https://example.com/font.css',
      });

      // Start loading but don't await
      mockDocumentHead.appendChild.mockImplementation(
        (element: HTMLLinkElement) => {
          // Never trigger onload to keep it loading
          return element;
        }
      );

      const loadPromise = loadFont(config);

      const states = getFontLoadStates(['loading-font']);
      expect(states.get('loading-font')?.status).toBe('loading');

      // Clean up - trigger load to resolve promise
      if (mockLinks[0]?.onload) mockLinks[0].onload(new Event('load'));
      await loadPromise;
    });

    it('returns states for multiple fonts', async () => {
      // Use a font with URL to actually trigger loading
      await loadFont(
        createFontConfig({ id: 'font1', url: 'https://example.com/font1.css' })
      );

      const states = getFontLoadStates(['font1', 'font2']);

      expect(states.size).toBe(2);
      expect(states.get('font1')?.status).toBe('loaded');
      expect(states.get('font2')?.status).toBe('idle');
    });
  });

  // =========================================================================
  // removeFont() Tests
  // =========================================================================

  describe('removeFont()', () => {
    it('removes font link from document', async () => {
      const config = createFontConfig({
        id: 'removable',
        url: 'https://example.com/font.css',
      });
      await loadFont(config);

      expect(isFontLoaded('removable')).toBe(true);

      removeFont('removable');

      expect(isFontLoaded('removable')).toBe(false);
    });

    it('does nothing if font does not exist', () => {
      // Should not throw
      expect(() => removeFont('nonexistent')).not.toThrow();
    });
  });

  // =========================================================================
  // clearAllFonts() Tests
  // =========================================================================

  describe('clearAllFonts()', () => {
    it('removes all font links from document', async () => {
      await loadFont(
        createFontConfig({ id: 'font1', url: 'https://example.com/1.css' })
      );
      await loadFont(
        createFontConfig({ id: 'font2', url: 'https://example.com/2.css' })
      );

      expect(isFontLoaded('font1')).toBe(true);
      expect(isFontLoaded('font2')).toBe(true);

      clearAllFonts();

      expect(isFontLoaded('font1')).toBe(false);
      expect(isFontLoaded('font2')).toBe(false);
    });
  });

  // =========================================================================
  // applyFontToDocument() Tests
  // =========================================================================

  describe('applyFontToDocument()', () => {
    it('sets CSS custom property', () => {
      applyFontToDocument('Inter, sans-serif');

      expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith(
        '--font-family',
        'Inter, sans-serif'
      );
    });
  });

  // =========================================================================
  // getCurrentFontFromDocument() Tests
  // =========================================================================

  describe('getCurrentFontFromDocument()', () => {
    it('returns null when no font is set', () => {
      mockComputedStyle.getPropertyValue.mockReturnValue('');

      const result = getCurrentFontFromDocument();

      expect(result).toBeNull();
    });

    it('returns font stack when set', () => {
      mockComputedStyle.getPropertyValue.mockReturnValue('Inter, sans-serif');

      const result = getCurrentFontFromDocument();

      expect(result).toBe('Inter, sans-serif');
    });

    it('trims whitespace from result', () => {
      mockComputedStyle.getPropertyValue.mockReturnValue(
        '  Inter, sans-serif  '
      );

      const result = getCurrentFontFromDocument();

      expect(result).toBe('Inter, sans-serif');
    });
  });

  // =========================================================================
  // preloadCriticalFonts() Tests
  // =========================================================================

  describe('preloadCriticalFonts()', () => {
    it('creates preload link elements for critical fonts', () => {
      preloadCriticalFonts();

      // Should create preload links for 'inter' and 'atkinson'
      expect(mockDocumentHead.appendChild).toHaveBeenCalledTimes(2);

      const links = mockLinks.filter((link) => link.rel === 'preload');
      expect(links).toHaveLength(2);
      expect(links[0].as).toBe('style');
    });
  });
});
