import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { connectionService } from '@/services/messaging/connection-service';
import type { ConnectionList } from '@/types/messaging';

/**
 * Hook for managing user connections (friend requests, blocks, etc.)
 *
 * Error Handling Pattern:
 * - Errors are captured in the `error` state for UI display
 * - Action functions (accept, decline, block, remove) re-throw after setError
 *   so callers can optionally handle with try/catch for additional behavior
 * - Query function (fetchConnections) does NOT re-throw - errors are in state only
 */
export function useConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionList>({
    pending_sent: [],
    pending_received: [],
    accepted: [],
    blocked: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await connectionService.getConnections();
      setConnections(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load connections';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (connectionId: string) => {
    setError(null);
    // Optimistic: move from pending_received to accepted immediately
    // Avoids read replica lag where fetchConnections() returns stale data
    setConnections((prev) => {
      const item = prev.pending_received.find(
        (i) => i.connection.id === connectionId
      );
      return {
        ...prev,
        pending_received: prev.pending_received.filter(
          (i) => i.connection.id !== connectionId
        ),
        accepted: item ? [...prev.accepted, item] : prev.accepted,
      };
    });
    try {
      await connectionService.respondToRequest({
        connection_id: connectionId,
        action: 'accept',
      });
      await fetchConnections();
    } catch (err: unknown) {
      await fetchConnections(); // Revert optimistic update on error
      const message =
        err instanceof Error ? err.message : 'Failed to accept request';
      setError(message);
      throw err;
    }
  };

  const declineRequest = async (connectionId: string) => {
    setError(null);
    // Optimistic: remove from pending_received immediately
    setConnections((prev) => ({
      ...prev,
      pending_received: prev.pending_received.filter(
        (item) => item.connection.id !== connectionId
      ),
    }));
    try {
      await connectionService.respondToRequest({
        connection_id: connectionId,
        action: 'decline',
      });
      await fetchConnections();
    } catch (err: unknown) {
      await fetchConnections(); // Revert optimistic update on error
      const message =
        err instanceof Error ? err.message : 'Failed to decline request';
      setError(message);
      throw err;
    }
  };

  const blockUser = async (connectionId: string) => {
    setError(null);
    // Optimistic: remove from pending_received/accepted, add to blocked
    setConnections((prev) => {
      const item =
        prev.pending_received.find(
          (i) => i.connection.id === connectionId
        ) ||
        prev.accepted.find((i) => i.connection.id === connectionId);
      return {
        ...prev,
        pending_received: prev.pending_received.filter(
          (i) => i.connection.id !== connectionId
        ),
        accepted: prev.accepted.filter(
          (i) => i.connection.id !== connectionId
        ),
        blocked: item ? [...prev.blocked, item] : prev.blocked,
      };
    });
    try {
      await connectionService.respondToRequest({
        connection_id: connectionId,
        action: 'block',
      });
      await fetchConnections();
    } catch (err: unknown) {
      await fetchConnections(); // Revert optimistic update on error
      const message =
        err instanceof Error ? err.message : 'Failed to block user';
      setError(message);
      throw err;
    }
  };

  const removeConnection = async (connectionId: string) => {
    setError(null);
    // Optimistic: remove from accepted immediately
    setConnections((prev) => ({
      ...prev,
      accepted: prev.accepted.filter(
        (item) => item.connection.id !== connectionId
      ),
    }));
    try {
      await connectionService.removeConnection(connectionId);
      await fetchConnections();
    } catch (err: unknown) {
      await fetchConnections(); // Revert optimistic update on error
      const message =
        err instanceof Error ? err.message : 'Failed to remove connection';
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
    } else {
      setConnections({
        pending_sent: [],
        pending_received: [],
        accepted: [],
        blocked: [],
      });
      setLoading(false);
    }
    // Re-fetch when auth user changes; fetchConnections reads auth internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    connections,
    loading,
    error,
    acceptRequest,
    declineRequest,
    blockUser,
    removeConnection,
    refreshConnections: fetchConnections,
  };
}
