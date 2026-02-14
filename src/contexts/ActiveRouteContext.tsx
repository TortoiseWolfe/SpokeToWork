'use client';

/**
 * ActiveRouteContext - Feature 041/046: Shared Active Route State
 *
 * Provides global active route state that is shared across all pages.
 * When a route is selected on one page, all other pages see the change immediately.
 *
 * This solves the hook instance isolation problem where each page had its own
 * useRoutes hook with separate activeRouteId state.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { createRouteService, RouteService } from '@/lib/routes/route-service';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import type { ActiveRoutePlanning } from '@/types/route';

const logger = createLogger('contexts:active-route');

export interface ActiveRouteContextValue {
  /** Currently active route ID (null if none) */
  activeRouteId: string | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Set a route as active (persists to Supabase) */
  setActiveRoute: (routeId: string) => Promise<void>;
  /** Clear the active route (persists to Supabase) */
  clearActiveRoute: () => Promise<void>;
  /** Force refresh from database */
  refresh: () => Promise<void>;
}

export const ActiveRouteContext = createContext<
  ActiveRouteContextValue | undefined
>(undefined);

export function ActiveRouteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const [activeRouteId, setActiveRouteIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const serviceRef = useRef<RouteService | null>(null);
  const supabaseRef = useRef(createClient());

  // Get or create service
  const getService = useCallback(() => {
    if (!serviceRef.current) {
      serviceRef.current = createRouteService(supabaseRef.current);
    }
    return serviceRef.current;
  }, []);

  // Fetch active route from database using RouteService
  const fetchActiveRoute = useCallback(async () => {
    if (!user) {
      setActiveRouteIdState(null);
      setIsLoading(false);
      return;
    }

    try {
      const service = getService();
      const active = await service.getActiveRoute();
      setActiveRouteIdState(active?.route_id ?? null);
    } catch (err) {
      logger.error('Error fetching active route', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, getService]);

  // Initial fetch when user changes
  useEffect(() => {
    if (authLoading) return;
    fetchActiveRoute();
  }, [authLoading, fetchActiveRoute]);

  // Subscribe to realtime changes for cross-tab sync
  useEffect(() => {
    if (!user) return;

    // Capture ref value for cleanup
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel('active_route_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_route_planning',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('Active route changed via realtime', { payload });
          if (payload.eventType === 'DELETE') {
            setActiveRouteIdState(null);
          } else if (payload.new && 'route_id' in payload.new) {
            setActiveRouteIdState(
              (payload.new as ActiveRoutePlanning).route_id
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Set active route using RouteService
  const setActiveRoute = useCallback(
    async (routeId: string) => {
      if (!user) {
        logger.warn('Cannot set active route: no user');
        return;
      }

      try {
        const service = getService();
        await service.setActiveRoute(routeId);

        // Update local state immediately (optimistic)
        setActiveRouteIdState(routeId);
        logger.info('Active route set', { routeId });
      } catch (err) {
        logger.error('Error setting active route', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [user, getService]
  );

  // Clear active route using RouteService
  const clearActiveRoute = useCallback(async () => {
    if (!user) {
      logger.warn('Cannot clear active route: no user');
      return;
    }

    try {
      const service = getService();
      await service.clearActiveRoute();

      // Update local state immediately (optimistic)
      setActiveRouteIdState(null);
      logger.info('Active route cleared');
    } catch (err) {
      logger.error('Error clearing active route', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }, [user, getService]);

  // Refresh from database
  const refresh = useCallback(async () => {
    await fetchActiveRoute();
  }, [fetchActiveRoute]);

  const value: ActiveRouteContextValue = {
    activeRouteId,
    isLoading,
    setActiveRoute,
    clearActiveRoute,
    refresh,
  };

  return (
    <ActiveRouteContext.Provider value={value}>
      {children}
    </ActiveRouteContext.Provider>
  );
}

/**
 * Hook to access active route state.
 * Must be used within an ActiveRouteProvider.
 */
export function useActiveRoute(): ActiveRouteContextValue {
  const context = useContext(ActiveRouteContext);
  if (context === undefined) {
    throw new Error(
      'useActiveRoute must be used within an ActiveRouteProvider'
    );
  }
  return context;
}
