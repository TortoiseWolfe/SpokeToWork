/**
 * Unit Tests for usePaymentConsent
 * Feature 052 - Test Coverage Expansion (T013)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import after mocks
import { usePaymentConsent } from '../usePaymentConsent';

describe('usePaymentConsent', () => {
  let mockLocalStorage: Record<string, string>;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh localStorage mock
    mockLocalStorage = {};
    localStorageMock = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
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
    it('should show modal when no consent stored', () => {
      const { result } = renderHook(() => usePaymentConsent());

      expect(result.current.hasConsent).toBe(false);
      expect(result.current.showModal).toBe(true);
    });

    it('should have consent when granted is stored', () => {
      mockLocalStorage['payment_consent'] = 'granted';

      const { result } = renderHook(() => usePaymentConsent());

      expect(result.current.hasConsent).toBe(true);
      expect(result.current.showModal).toBe(false);
    });

    it('should read consent date from storage', () => {
      mockLocalStorage['payment_consent'] = 'granted';
      mockLocalStorage['payment_consent_date'] = '2024-01-01T00:00:00Z';

      const { result } = renderHook(() => usePaymentConsent());

      expect(result.current.consentDate).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('grantConsent', () => {
    it('should set hasConsent to true', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.grantConsent();
      });

      expect(result.current.hasConsent).toBe(true);
    });

    it('should hide modal', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.grantConsent();
      });

      expect(result.current.showModal).toBe(false);
    });

    it('should store consent in localStorage', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.grantConsent();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'payment_consent',
        'granted'
      );
    });

    it('should set consent date', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.grantConsent();
      });

      expect(result.current.consentDate).toBeTruthy();
    });
  });

  describe('declineConsent', () => {
    it('should set hasConsent to false', () => {
      mockLocalStorage['payment_consent'] = 'granted';

      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.declineConsent();
      });

      expect(result.current.hasConsent).toBe(false);
    });

    it('should hide modal', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.declineConsent();
      });

      expect(result.current.showModal).toBe(false);
    });

    it('should store decline in localStorage', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.declineConsent();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'payment_consent',
        'declined'
      );
    });
  });

  describe('resetConsent', () => {
    it('should clear consent state', () => {
      mockLocalStorage['payment_consent'] = 'granted';

      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.resetConsent();
      });

      expect(result.current.hasConsent).toBe(false);
      expect(result.current.consentDate).toBeNull();
    });

    it('should show modal after reset', () => {
      mockLocalStorage['payment_consent'] = 'granted';

      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.resetConsent();
      });

      expect(result.current.showModal).toBe(true);
    });

    it('should remove items from localStorage', () => {
      const { result } = renderHook(() => usePaymentConsent());

      act(() => {
        result.current.resetConsent();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'payment_consent'
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'payment_consent_date'
      );
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => usePaymentConsent());

      expect(result.current).toHaveProperty('hasConsent');
      expect(result.current).toHaveProperty('showModal');
      expect(result.current).toHaveProperty('consentDate');
      expect(result.current).toHaveProperty('grantConsent');
      expect(result.current).toHaveProperty('declineConsent');
      expect(result.current).toHaveProperty('resetConsent');
    });
  });
});
