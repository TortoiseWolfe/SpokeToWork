/**
 * Unit Tests for client.ts
 * Feature 052 - Test Coverage Expansion (T006)
 *
 * Tests Supabase client initialization, singleton pattern, and connection helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// IMPORTANT: Unmock client.ts since we're testing the actual implementation
// The global setup.ts mocks it for component tests, but we need the real thing
vi.unmock('@/lib/supabase/client');

// Mock the external Supabase SDK dependency
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      limit: vi.fn(),
    })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('supabase/client.ts', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Set up required env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('createClient()', () => {
    it('should create a client with correct configuration', async () => {
      const { createClient: createSupabaseClient } = await import(
        '@supabase/supabase-js'
      );
      const { createClient } = await import('../client');

      createClient();

      expect(createSupabaseClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            flowType: 'implicit',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          }),
        })
      );
    });

    it('should return singleton on repeated calls', async () => {
      const { createClient } = await import('../client');

      const first = createClient();
      const second = createClient();

      expect(first).toBe(second);
    });

    it('should throw when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      vi.resetModules();

      const { createClient } = await import('../client');

      expect(() => createClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    });

    it('should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
      vi.resetModules();

      const { createClient } = await import('../client');

      expect(() => createClient()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    });
  });

  describe('getSupabase()', () => {
    it('should return the same client as createClient', async () => {
      const { createClient, getSupabase } = await import('../client');

      const fromCreate = createClient();
      const fromGet = getSupabase();

      expect(fromCreate).toBe(fromGet);
    });
  });

  describe('isSupabaseOnline()', () => {
    it('should return true when query succeeds', async () => {
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          limit: mockLimit,
        })),
      });

      const { isSupabaseOnline } = await import('../client');
      const result = await isSupabaseOnline();

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payment_intents');
    });

    it('should return false on PGRST301 connection error', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301' },
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          limit: mockLimit,
        })),
      });

      const { isSupabaseOnline } = await import('../client');
      const result = await isSupabaseOnline();

      expect(result).toBe(false);
    });

    it('should return true on other non-connection errors', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found - but connection works
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          limit: mockLimit,
        })),
      });

      const { isSupabaseOnline } = await import('../client');
      const result = await isSupabaseOnline();

      expect(result).toBe(true);
    });

    it('should return false when exception is thrown', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const { isSupabaseOnline } = await import('../client');
      const result = await isSupabaseOnline();

      expect(result).toBe(false);
    });
  });

  describe('onConnectionChange()', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: true,
      });

      // Mock successful isSupabaseOnline for initial check
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          limit: mockLimit,
        })),
      });
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should register online and offline event listeners', async () => {
      const { onConnectionChange } = await import('../client');

      onConnectionChange(() => {});

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('should return unsubscribe function that removes listeners', async () => {
      const { onConnectionChange } = await import('../client');

      const unsubscribe = onConnectionChange(() => {});
      unsubscribe();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('should call callback with false when offline event fires', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: true,
      });

      const callback = vi.fn();
      const { onConnectionChange } = await import('../client');

      onConnectionChange(callback);

      // Get the offline handler
      const offlineCall = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'offline'
      );
      const offlineHandler = offlineCall?.[1] as () => void;

      // Simulate going offline
      offlineHandler();

      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe('supabase proxy', () => {
    it('should proxy auth methods to the client', async () => {
      const { supabase } = await import('../client');

      // Access auth property through proxy
      const auth = supabase.auth;

      expect(auth).toBeDefined();
      expect(auth.getSession).toBeDefined();
    });

    it('should proxy from() method to the client', async () => {
      const { supabase } = await import('../client');

      // Use a valid table name from the schema
      supabase.from('payment_intents');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payment_intents');
    });
  });
});
