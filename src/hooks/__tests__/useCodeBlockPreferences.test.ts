/**
 * Unit Tests for useCodeBlockPreferences
 * Feature 052 - Test Coverage Expansion (T023)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCodeBlockPreferences } from '../useCodeBlockPreferences';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useCodeBlockPreferences', () => {
  let mockLocalStorage: Record<string, string>;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh localStorage mock for each test
    mockLocalStorage = {};
    localStorageMock = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockLocalStorage).forEach(
          (key) => delete mockLocalStorage[key]
        );
      }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return default preferences', () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      expect(result.current.preferences.showLineNumbers).toBe(false);
      expect(result.current.preferences.preferredTheme).toBeUndefined();
      expect(result.current.preferences.expandedBlocks).toEqual([]);
    });

    it('should load preferences from localStorage', () => {
      const stored = {
        showLineNumbers: true,
        preferredTheme: 'dark',
        expandedBlocks: ['block-1'],
        lastUpdated: '2024-01-01T00:00:00Z',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));

      const { result } = renderHook(() => useCodeBlockPreferences());

      // Need to wait for useEffect
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'codeBlockPreferences'
      );
    });
  });

  describe('toggleLineNumbers', () => {
    it('should toggle showLineNumbers from false to true', async () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      // Initial state
      expect(result.current.preferences.showLineNumbers).toBe(false);

      await act(async () => {
        result.current.toggleLineNumbers();
      });

      expect(result.current.preferences.showLineNumbers).toBe(true);
    });

    it('should toggle showLineNumbers from true to false', async () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      await act(async () => {
        result.current.toggleLineNumbers(); // false -> true
      });

      expect(result.current.preferences.showLineNumbers).toBe(true);

      await act(async () => {
        result.current.toggleLineNumbers(); // true -> false
      });

      expect(result.current.preferences.showLineNumbers).toBe(false);
    });

    it('should save to localStorage', async () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      await act(async () => {
        result.current.toggleLineNumbers();
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('toggleBlockExpansion', () => {
    it('should add block to expandedBlocks', async () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      await act(async () => {
        result.current.toggleBlockExpansion('block-1');
      });

      expect(result.current.preferences.expandedBlocks).toContain('block-1');
    });

    it('should remove block from expandedBlocks if already present', async () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      await act(async () => {
        result.current.toggleBlockExpansion('block-1');
      });

      await act(async () => {
        result.current.toggleBlockExpansion('block-1');
      });

      expect(result.current.preferences.expandedBlocks).not.toContain(
        'block-1'
      );
    });

    it('should limit expandedBlocks to 100 items', () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      // Add 101 blocks
      for (let i = 0; i < 101; i++) {
        act(() => {
          result.current.toggleBlockExpansion(`block-${i}`);
        });
      }

      expect(
        result.current.preferences.expandedBlocks.length
      ).toBeLessThanOrEqual(100);
    });
  });

  describe('updatePreference', () => {
    it('should update preferredTheme', () => {
      const { result } = renderHook(() => useCodeBlockPreferences());

      act(() => {
        result.current.updatePreference('preferredTheme', 'monokai');
      });

      expect(result.current.preferences.preferredTheme).toBe('monokai');
    });

    it('should update lastUpdated timestamp', () => {
      const { result } = renderHook(() => useCodeBlockPreferences());
      const before = new Date().toISOString();

      act(() => {
        result.current.updatePreference('showLineNumbers', true);
      });

      const after = new Date().toISOString();
      expect(result.current.preferences.lastUpdated >= before).toBe(true);
      expect(result.current.preferences.lastUpdated <= after).toBe(true);
    });
  });

  describe('copyToClipboard', () => {
    it('should copy content to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCodeBlockPreferences());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copyToClipboard('test content');
      });

      expect(mockWriteText).toHaveBeenCalledWith('test content');
      expect(success).toBe(true);
    });

    it('should return false on clipboard error', async () => {
      const mockWriteText = vi
        .fn()
        .mockRejectedValue(new Error('Clipboard error'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCodeBlockPreferences());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copyToClipboard('test content');
      });

      expect(success).toBe(false);
    });
  });
});
