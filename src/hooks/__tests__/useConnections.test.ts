/**
 * Unit Tests for useConnections
 * Feature 052 - Test Coverage Expansion (T016)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock connection service
const mockGetConnections = vi.fn();
const mockRespondToRequest = vi.fn();
const mockRemoveConnection = vi.fn();

vi.mock('@/services/messaging/connection-service', () => ({
  connectionService: {
    getConnections: () => mockGetConnections(),
    respondToRequest: (params: unknown) => mockRespondToRequest(params),
    removeConnection: (id: string) => mockRemoveConnection(id),
  },
}));

import { useConnections } from '../useConnections';

describe('useConnections', () => {
  const mockConnectionList = {
    pending_sent: [{ id: 'ps-1', addressee_id: 'user-2' }],
    pending_received: [{ id: 'pr-1', requester_id: 'user-3' }],
    accepted: [{ id: 'acc-1', requester_id: 'user-4' }],
    blocked: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnections.mockResolvedValue(mockConnectionList);
    mockRespondToRequest.mockResolvedValue(undefined);
    mockRemoveConnection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useConnections());

      expect(result.current.loading).toBe(true);
    });

    it('should fetch connections on mount', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetConnections).toHaveBeenCalled();
    });

    it('should set connections after fetch', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.connections).toEqual(mockConnectionList);
    });

    it('should handle fetch error', async () => {
      mockGetConnections.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('acceptRequest', () => {
    it('should call respondToRequest with accept action', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.acceptRequest('conn-123');
      });

      expect(mockRespondToRequest).toHaveBeenCalledWith({
        connection_id: 'conn-123',
        action: 'accept',
      });
    });

    it('should refetch connections after accepting', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.acceptRequest('conn-123');
      });

      // Called twice: initial + after accept
      expect(mockGetConnections).toHaveBeenCalledTimes(2);
    });

    it('should throw on failure', async () => {
      mockRespondToRequest.mockRejectedValue(new Error('Accept failed'));

      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The hook throws after setting error, verify it throws
      await expect(
        act(async () => {
          await result.current.acceptRequest('conn-123');
        })
      ).rejects.toThrow('Accept failed');
    });
  });

  describe('declineRequest', () => {
    it('should call respondToRequest with decline action', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.declineRequest('conn-123');
      });

      expect(mockRespondToRequest).toHaveBeenCalledWith({
        connection_id: 'conn-123',
        action: 'decline',
      });
    });
  });

  describe('blockUser', () => {
    it('should call respondToRequest with block action', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.blockUser('conn-123');
      });

      expect(mockRespondToRequest).toHaveBeenCalledWith({
        connection_id: 'conn-123',
        action: 'block',
      });
    });
  });

  describe('removeConnection', () => {
    it('should call removeConnection service', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeConnection('conn-123');
      });

      expect(mockRemoveConnection).toHaveBeenCalledWith('conn-123');
    });
  });

  describe('refreshConnections', () => {
    it('should refetch connections', async () => {
      const { result } = renderHook(() => useConnections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshConnections();
      });

      expect(mockGetConnections).toHaveBeenCalledTimes(2);
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', async () => {
      const { result } = renderHook(() => useConnections());

      expect(result.current).toHaveProperty('connections');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('acceptRequest');
      expect(result.current).toHaveProperty('declineRequest');
      expect(result.current).toHaveProperty('blockUser');
      expect(result.current).toHaveProperty('removeConnection');
      expect(result.current).toHaveProperty('refreshConnections');
    });
  });
});
