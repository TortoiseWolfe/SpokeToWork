/**
 * Unit Tests for usePaymentRealtime
 * Feature 052 - Test Coverage Expansion (T014)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock payment result
const mockPaymentResult = {
  id: 'result-123',
  payment_intent_id: 'intent-123',
  status: 'completed',
  provider: 'stripe',
  amount: 2000,
  currency: 'usd',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock channel
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPaymentResult,
            error: null,
          }),
        })),
      })),
    })),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

// Import after mocks
import { usePaymentRealtime } from '../usePaymentRealtime';

describe('usePaymentRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => usePaymentRealtime('result-123'));

      expect(result.current.loading).toBe(true);
    });

    it('should set loading false when no paymentResultId', async () => {
      const { result } = renderHook(() => usePaymentRealtime(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentResult).toBeNull();
    });
  });

  describe('fetching payment result', () => {
    it('should fetch payment result on mount', async () => {
      const { result } = renderHook(() => usePaymentRealtime('result-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentResult).toEqual(mockPaymentResult);
    });

    it('should handle fetch error', async () => {
      const { supabase } = await import('@/lib/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      } as never);

      const { result } = renderHook(() => usePaymentRealtime('result-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('realtime subscription', () => {
    it('should subscribe to realtime channel', async () => {
      const { supabase } = await import('@/lib/supabase/client');

      renderHook(() => usePaymentRealtime('result-123'));

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith(
          'payment-result-result-123'
        );
      });
    });

    it('should setup postgres_changes listener', async () => {
      renderHook(() => usePaymentRealtime('result-123'));

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'payment_results',
          }),
          expect.any(Function)
        );
      });
    });

    it('should call subscribe', async () => {
      renderHook(() => usePaymentRealtime('result-123'));

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => usePaymentRealtime('result-123'));

      expect(result.current).toHaveProperty('paymentResult');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });
  });
});
