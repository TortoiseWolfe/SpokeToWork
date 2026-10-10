/**
 * Payment Service: network-failure classification (#99)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent } from '@/lib/payments/payment-service';

const { singleMock, queueOperationMock } = vi.hoisted(() => ({
  singleMock: vi.fn(),
  queueOperationMock: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-123', email: 'test@example.com' } },
          error: null,
        })
      ),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: singleMock,
        })),
      })),
    })),
  },
  isSupabaseOnline: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/offline-queue', () => ({
  queueOperation: queueOperationMock,
}));

/** The envelope postgrest-js RETURNS when fetch itself fails. */
function fetchFailure(message: string) {
  return {
    data: null,
    error: { message, details: '', hint: '', code: '' },
    status: 0,
  };
}

describe('createPaymentIntent network classification (#99)', () => {
  beforeEach(() => {
    singleMock.mockReset();
    queueOperationMock.mockReset();
    queueOperationMock.mockResolvedValue(undefined);
  });

  it.each([
    { engine: 'WebKit', message: 'TypeError: Load failed' },
    { engine: 'Chromium', message: 'TypeError: Failed to fetch' },
    {
      engine: 'Firefox',
      message: 'TypeError: NetworkError when attempting to fetch resource.',
    },
  ])('queues the payment on a $engine fetch failure', async ({ message }) => {
    singleMock.mockResolvedValue(fetchFailure(message));

    await expect(
      createPaymentIntent(2000, 'usd', 'one_time', 'test@example.com')
    ).rejects.toThrow('Network error. Payment has been queued');

    expect(queueOperationMock).toHaveBeenCalledTimes(1);
    expect(queueOperationMock).toHaveBeenCalledWith(
      'payment_intent',
      expect.objectContaining({ amount: 2000, currency: 'usd' })
    );
  });

  it('keeps the original error as cause', async () => {
    const response = fetchFailure('TypeError: Load failed');
    singleMock.mockResolvedValue(response);

    const thrown = await createPaymentIntent(
      2000,
      'usd',
      'one_time',
      'test@example.com'
    ).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).cause).toBe(response.error);
  });

  it('does not queue a database rejection whose message mentions network', async () => {
    const rejection = {
      message:
        'new row for relation "payment_intents" violates check constraint "check_network_id"',
      details: '',
      hint: '',
      code: '23514',
    };
    singleMock.mockResolvedValue({ data: null, error: rejection, status: 400 });

    await expect(
      createPaymentIntent(2000, 'usd', 'one_time', 'test@example.com')
    ).rejects.toBe(rejection);
    expect(queueOperationMock).not.toHaveBeenCalled();
  });
});
