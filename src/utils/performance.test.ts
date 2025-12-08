/**
 * Tests for performance.ts
 * Covers Web Vitals tracking, performance measurement, and resource timing analysis
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
const { mockLogger, mockOnCLS, mockOnFCP, mockOnLCP, mockOnTTFB, mockOnINP } =
  vi.hoisted(() => ({
    mockLogger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mockOnCLS: vi.fn(),
    mockOnFCP: vi.fn(),
    mockOnLCP: vi.fn(),
    mockOnTTFB: vi.fn(),
    mockOnINP: vi.fn(),
  }));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

vi.mock('web-vitals', () => ({
  onCLS: mockOnCLS,
  onFCP: mockOnFCP,
  onLCP: mockOnLCP,
  onTTFB: mockOnTTFB,
  onINP: mockOnINP,
}));

describe('performance', () => {
  // Mock localStorage
  let mockLocalStorage: Record<string, string>;

  // Mock performance API
  let mockPerformanceNow: ReturnType<typeof vi.fn>;
  let mockGetEntriesByType: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset localStorage mock
    mockLocalStorage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => mockLocalStorage[key] || null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        mockLocalStorage[key] = value;
      }
    );
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key: string) => {
        delete mockLocalStorage[key];
      }
    );

    // Mock performance API
    mockPerformanceNow = vi.fn().mockReturnValue(0);
    mockGetEntriesByType = vi.fn().mockReturnValue([]);
    Object.defineProperty(global, 'performance', {
      value: {
        now: mockPerformanceNow,
        getEntriesByType: mockGetEntriesByType,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  // =========================================================================
  // initWebVitals() Tests
  // =========================================================================

  describe('initWebVitals()', () => {
    it('registers all web vitals callbacks', async () => {
      const { initWebVitals } = await import('./performance');

      initWebVitals();

      expect(mockOnCLS).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOnFCP).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOnLCP).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOnTTFB).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOnINP).toHaveBeenCalledWith(expect.any(Function));
    });

    it('does not register callbacks in SSR', async () => {
      // Simulate SSR by removing window
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting to undefined for test
      global.window = undefined;

      vi.resetModules();
      const { initWebVitals } = await import('./performance');

      initWebVitals();

      expect(mockOnCLS).not.toHaveBeenCalled();

      global.window = originalWindow;
    });
  });

  // =========================================================================
  // getStoredMetrics() Tests
  // =========================================================================

  describe('getStoredMetrics()', () => {
    it('returns null when no metrics stored', async () => {
      const { getStoredMetrics } = await import('./performance');

      const result = getStoredMetrics();

      expect(result).toBeNull();
    });

    it('returns stored metrics', async () => {
      mockLocalStorage['webVitals'] = JSON.stringify({
        CLS: { value: 0.1, timestamp: 123, rating: 'good' },
        FCP: { value: 1000, timestamp: 123, rating: 'good' },
        LCP: { value: 2500, timestamp: 123, rating: 'needs-improvement' },
      });

      const { getStoredMetrics } = await import('./performance');

      const result = getStoredMetrics();

      expect(result).not.toBeNull();
      expect(result?.CLS).toBe(0.1);
      expect(result?.FCP).toBe(1000);
      expect(result?.LCP).toBe(2500);
    });

    it('returns null on invalid JSON', async () => {
      mockLocalStorage['webVitals'] = 'invalid json';

      const { getStoredMetrics } = await import('./performance');

      const result = getStoredMetrics();

      expect(result).toBeNull();
    });

    it('returns null in SSR', async () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting to undefined for test
      global.window = undefined;

      vi.resetModules();
      const { getStoredMetrics } = await import('./performance');

      const result = getStoredMetrics();

      expect(result).toBeNull();

      global.window = originalWindow;
    });
  });

  // =========================================================================
  // clearMetrics() Tests
  // =========================================================================

  describe('clearMetrics()', () => {
    it('removes metrics from localStorage', async () => {
      mockLocalStorage['webVitals'] = JSON.stringify({ CLS: { value: 0.1 } });

      const { clearMetrics } = await import('./performance');

      clearMetrics();

      expect(mockLocalStorage['webVitals']).toBeUndefined();
    });

    it('does nothing in SSR', async () => {
      const originalWindow = global.window;
      mockLocalStorage['webVitals'] = 'test';

      // @ts-expect-error - intentionally setting to undefined for test
      global.window = undefined;

      vi.resetModules();
      const { clearMetrics } = await import('./performance');

      clearMetrics();

      // Should not throw, localStorage operations are skipped
      global.window = originalWindow;
    });
  });

  // =========================================================================
  // measurePerformance() Tests
  // =========================================================================

  describe('measurePerformance()', () => {
    it('measures sync function execution time', async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(50);

      const { measurePerformance } = await import('./performance');

      const result = measurePerformance('test-sync', () => 42);

      expect(result).toBe(42);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance measurement',
        expect.objectContaining({
          operation: 'test-sync',
          durationMs: '50.00',
        })
      );
    });

    it('measures async function execution time', async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const { measurePerformance } = await import('./performance');

      const result = await measurePerformance('test-async', async () => {
        return 'async result';
      });

      expect(result).toBe('async result');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance measurement',
        expect.objectContaining({
          operation: 'test-async',
        })
      );
    });

    it('logs timing even on async rejection', async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(25);

      const { measurePerformance } = await import('./performance');

      const asyncFn = measurePerformance('test-error', async () => {
        throw new Error('Test error');
      });

      await expect(asyncFn).rejects.toThrow('Test error');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance measurement',
        expect.objectContaining({
          operation: 'test-error',
        })
      );
    });

    it('returns sync function result', async () => {
      const { measurePerformance } = await import('./performance');

      const result = measurePerformance('add', () => 1 + 1);

      expect(result).toBe(2);
    });
  });

  // =========================================================================
  // analyzeResourceTiming() Tests
  // =========================================================================

  describe('analyzeResourceTiming()', () => {
    it('returns null in SSR', async () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting to undefined for test
      global.window = undefined;

      vi.resetModules();
      const { analyzeResourceTiming } = await import('./performance');

      const result = analyzeResourceTiming();

      expect(result).toBeNull();

      global.window = originalWindow;
    });

    it('returns analysis of resource timing', async () => {
      mockGetEntriesByType.mockReturnValue([
        {
          name: 'https://example.com/script.js',
          startTime: 0,
          responseEnd: 150,
          initiatorType: 'script',
        },
        {
          name: 'https://example.com/style.css',
          startTime: 10,
          responseEnd: 60,
          initiatorType: 'link',
        },
      ]);

      const { analyzeResourceTiming } = await import('./performance');

      const result = analyzeResourceTiming();

      expect(result).not.toBeNull();
      expect(result?.totalResources).toBe(2);
      expect(result?.slowestResources).toHaveLength(1); // Only script.js > 100ms
      expect(result?.slowestResources[0].name).toBe('script.js');
      expect(result?.byType['script']).toEqual({
        count: 1,
        totalDuration: 150,
      });
      expect(result?.byType['link']).toEqual({ count: 1, totalDuration: 50 });
    });

    it('limits slowest resources to top 5', async () => {
      const resources = [];
      for (let i = 0; i < 10; i++) {
        resources.push({
          name: `https://example.com/resource${i}.js`,
          startTime: 0,
          responseEnd: 200 + i * 10, // 200, 210, 220, etc.
          initiatorType: 'script',
        });
      }
      mockGetEntriesByType.mockReturnValue(resources);

      const { analyzeResourceTiming } = await import('./performance');

      const result = analyzeResourceTiming();

      expect(result?.slowestResources).toHaveLength(5);
      // Should be sorted by duration, slowest first
      expect(result?.slowestResources[0].duration).toBe(290);
    });

    it('handles resources without initiatorType', async () => {
      mockGetEntriesByType.mockReturnValue([
        {
          name: 'https://example.com/resource',
          startTime: 0,
          responseEnd: 150,
          // No initiatorType
        },
      ]);

      const { analyzeResourceTiming } = await import('./performance');

      const result = analyzeResourceTiming();

      expect(result?.byType['other']).toEqual({ count: 1, totalDuration: 150 });
    });
  });

  // =========================================================================
  // getNavigationTiming() Tests
  // =========================================================================

  describe('getNavigationTiming()', () => {
    it('returns null in SSR', async () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting to undefined for test
      global.window = undefined;

      vi.resetModules();
      const { getNavigationTiming } = await import('./performance');

      const result = getNavigationTiming();

      expect(result).toBeNull();

      global.window = originalWindow;
    });

    it('returns null when no navigation entry', async () => {
      mockGetEntriesByType.mockImplementation((type: string) => {
        if (type === 'navigation') return [];
        return [];
      });

      const { getNavigationTiming } = await import('./performance');

      const result = getNavigationTiming();

      expect(result).toBeNull();
    });

    it('returns navigation timing data', async () => {
      mockGetEntriesByType.mockImplementation((type: string) => {
        if (type === 'navigation') {
          return [
            {
              domContentLoadedEventStart: 100,
              domContentLoadedEventEnd: 150,
              loadEventStart: 200,
              loadEventEnd: 250,
              fetchStart: 0,
              domInteractive: 120,
              domainLookupStart: 10,
              domainLookupEnd: 30,
              connectStart: 30,
              connectEnd: 50,
              requestStart: 50,
              responseStart: 70,
              responseEnd: 90,
              domComplete: 180,
            },
          ];
        }
        return [];
      });

      const { getNavigationTiming } = await import('./performance');

      const result = getNavigationTiming();

      expect(result).not.toBeNull();
      expect(result?.domContentLoaded).toBe(50); // 150 - 100
      expect(result?.loadComplete).toBe(50); // 250 - 200
      expect(result?.domInteractive).toBe(120); // 120 - 0
      expect(result?.dnsLookup).toBe(20); // 30 - 10
      expect(result?.tcpConnection).toBe(20); // 50 - 30
      expect(result?.request).toBe(20); // 70 - 50
      expect(result?.response).toBe(20); // 90 - 70
      expect(result?.domProcessing).toBe(60); // 180 - 120
    });
  });

  // =========================================================================
  // sendToAnalytics Integration Tests
  // =========================================================================

  describe('sendToAnalytics (via initWebVitals)', () => {
    it('stores metrics in localStorage when callback is invoked', async () => {
      const { initWebVitals } = await import('./performance');

      initWebVitals();

      // Get the callback that was passed to onCLS
      const clsCallback = mockOnCLS.mock.calls[0][0];

      // Simulate a CLS metric being reported
      clsCallback({
        name: 'CLS',
        value: 0.05,
        id: 'v1-123',
        rating: 'good',
      });

      // Check that it was stored
      const stored = JSON.parse(mockLocalStorage['webVitals']);
      expect(stored.CLS.value).toBe(0.05);
      expect(stored.CLS.rating).toBe('good');
    });

    it('logs metric in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      vi.resetModules();
      const { initWebVitals } = await import('./performance');

      initWebVitals();

      const fcpCallback = mockOnFCP.mock.calls[0][0];
      fcpCallback({
        name: 'FCP',
        value: 1200,
        id: 'v1-456',
        rating: 'needs-improvement',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Web Vitals metric',
        expect.objectContaining({
          name: 'FCP',
          value: 1200,
          rating: 'needs-improvement',
        })
      );

      vi.unstubAllEnvs();
    });
  });
});
