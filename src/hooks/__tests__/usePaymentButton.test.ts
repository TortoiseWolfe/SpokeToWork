/**
 * Unit Tests for usePaymentButton
 * Feature 052 - Test Coverage Expansion (T012)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock usePaymentConsent
vi.mock('../usePaymentConsent', () => ({
  usePaymentConsent: vi.fn(() => ({
    hasConsent: true,
    showModal: false,
    consentDate: '2024-01-01T00:00:00Z',
    grantConsent: vi.fn(),
    declineConsent: vi.fn(),
    resetConsent: vi.fn(),
  })),
}));

// Mock payment services
vi.mock('@/lib/payments/payment-service', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({ id: 'intent-123' }),
}));

vi.mock('@/lib/payments/stripe', () => ({
  createCheckoutSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/payments/paypal', () => ({
  createPayPalOrder: vi.fn().mockResolvedValue(undefined),
}));

// Mock offline queue
vi.mock('@/lib/offline-queue', () => ({
  getPendingCount: vi.fn().mockResolvedValue(0),
}));

// Import after mocks
import { usePaymentButton } from '../usePaymentButton';

describe('usePaymentButton', () => {
  const defaultOptions = {
    amount: 2000,
    currency: 'usd' as const,
    type: 'one_time' as const,
    customerEmail: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with no selected provider', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      expect(result.current.selectedProvider).toBeNull();
    });

    it('should start with isProcessing false', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      expect(result.current.isProcessing).toBe(false);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      expect(result.current.error).toBeNull();
    });

    it('should have consent from mocked hook', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      expect(result.current.hasConsent).toBe(true);
    });
  });

  describe('selectProvider', () => {
    it('should set selected provider to stripe', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      act(() => {
        result.current.selectProvider('stripe');
      });

      expect(result.current.selectedProvider).toBe('stripe');
    });

    it('should set selected provider to paypal', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      act(() => {
        result.current.selectProvider('paypal');
      });

      expect(result.current.selectedProvider).toBe('paypal');
    });

    it('should clear error when selecting provider', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      // Trigger an error first by trying to pay without provider
      act(() => {
        result.current.initiatePayment();
      });

      expect(result.current.error).toBeTruthy();

      // Now select a provider
      act(() => {
        result.current.selectProvider('stripe');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('initiatePayment', () => {
    it('should error if no provider selected', async () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      await act(async () => {
        await result.current.initiatePayment();
      });

      expect(result.current.error?.message).toBe(
        'Please select a payment provider'
      );
    });

    it('should error if no consent', async () => {
      const { usePaymentConsent } = await import('../usePaymentConsent');
      vi.mocked(usePaymentConsent).mockReturnValue({
        hasConsent: false,
        showModal: true,
        consentDate: null,
        grantConsent: vi.fn(),
        declineConsent: vi.fn(),
        resetConsent: vi.fn(),
      });

      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      act(() => {
        result.current.selectProvider('stripe');
      });

      await act(async () => {
        await result.current.initiatePayment();
      });

      expect(result.current.error?.message).toContain('consent required');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      // Trigger an error
      await act(async () => {
        await result.current.initiatePayment();
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('queuedCount', () => {
    it('should load queued count on mount', async () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      await waitFor(() => {
        expect(result.current.queuedCount).toBe(0);
      });
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => usePaymentButton(defaultOptions));

      expect(result.current).toHaveProperty('selectedProvider');
      expect(result.current).toHaveProperty('isProcessing');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('queuedCount');
      expect(result.current).toHaveProperty('hasConsent');
      expect(result.current).toHaveProperty('selectProvider');
      expect(result.current).toHaveProperty('initiatePayment');
      expect(result.current).toHaveProperty('clearError');
    });
  });
});
