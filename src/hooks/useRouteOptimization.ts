'use client';

/**
 * useRouteOptimization Hook - Feature 046: Route Optimization
 *
 * React hook for optimizing route company order using TSP solver.
 * Provides state management for the optimization modal workflow.
 *
 * @see src/lib/routes/route-service.ts
 * @see src/lib/routes/tsp-solver.ts
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createRouteService } from '@/lib/routes/route-service';
import { createLogger } from '@/lib/logger';
import type { RouteOptimizationResult } from '@/lib/routes/optimization-types';
import type { RouteCompanyWithDetails } from '@/types/route';

const logger = createLogger('hooks:useRouteOptimization');

export interface UseRouteOptimizationOptions {
  /** Callback when optimization is applied successfully */
  onSuccess?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseRouteOptimizationReturn {
  /** Whether the optimization modal is open */
  isOpen: boolean;
  /** Whether optimization is in progress */
  isLoading: boolean;
  /** Whether the optimization is being applied */
  isApplying: boolean;
  /** Error message if optimization failed */
  error: string | null;
  /** The optimization result */
  result: RouteOptimizationResult | null;
  /** Original order of company IDs before optimization */
  originalOrder: string[];
  /** Companies with details for display */
  companies: RouteCompanyWithDetails[];
  /** Open the modal and start optimization */
  optimize: (routeId: string) => Promise<void>;
  /** Apply the optimization */
  apply: () => Promise<void>;
  /** Close the modal */
  close: () => void;
  /** Reset state */
  reset: () => void;
}

export function useRouteOptimization(
  options: UseRouteOptimizationOptions = {}
): UseRouteOptimizationReturn {
  const { onSuccess, onError } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteOptimizationResult | null>(null);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [companies, setCompanies] = useState<RouteCompanyWithDetails[]>([]);
  const [routeId, setRouteId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setIsApplying(false);
    setError(null);
    setResult(null);
    setOriginalOrder([]);
    setCompanies([]);
    setRouteId(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep the result for potential retry
  }, []);

  const optimize = useCallback(
    async (id: string) => {
      logger.info('Starting route optimization', { routeId: id });
      setRouteId(id);
      setIsOpen(true);
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const supabase = createClient();
        const service = createRouteService(supabase);

        // Get companies for display
        const routeCompanies = await service.getRouteCompanies(id);
        setCompanies(routeCompanies);

        // Get original order
        const sorted = [...routeCompanies].sort(
          (a, b) => a.sequence_order - b.sequence_order
        );
        setOriginalOrder(sorted.map((c) => c.id));

        // Check if there are enough companies
        if (routeCompanies.length < 2) {
          setError('Need at least 2 companies to optimize');
          setIsLoading(false);
          return;
        }

        // Check for companies with missing coordinates
        const missingCoords = routeCompanies.filter(
          (c) => !c.company.latitude || !c.company.longitude
        );
        if (missingCoords.length > 0) {
          setError(
            `${missingCoords.length} company(ies) missing coordinates. Please update their locations first.`
          );
          setIsLoading(false);
          return;
        }

        // Run optimization
        const comparison = await service.optimizeRoute(id);

        // Convert comparison data to RouteOptimizationResult format
        const optimizationResult: RouteOptimizationResult = {
          optimizedOrder: comparison.after.order,
          totalDistanceMiles: comparison.after.distanceMiles,
          estimatedTimeMinutes: comparison.after.timeMinutes,
          distanceSavingsMiles: comparison.savings.distanceMiles,
          distanceSavingsPercent: comparison.savings.percent,
          originalDistanceMiles: comparison.before.distanceMiles,
          distancesFromStart: comparison.after.distancesFromStart ?? {},
        };
        setResult(optimizationResult);

        logger.info('Optimization complete', {
          routeId: id,
          savings: comparison.savings.distanceMiles.toFixed(2),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to optimize route';
        logger.error('Optimization failed', { routeId: id, error: message });
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  const apply = useCallback(async () => {
    if (!routeId || !result) {
      logger.warn('Cannot apply optimization: missing route or result');
      return;
    }

    logger.info('Applying route optimization', { routeId });
    setIsApplying(true);
    setError(null);

    try {
      const supabase = createClient();
      const service = createRouteService(supabase);

      // Apply the optimized order
      await service.applyRouteOptimization(
        routeId,
        result.optimizedOrder,
        result.distancesFromStart
      );

      logger.info('Optimization applied successfully', { routeId });

      // Close modal and reset
      reset();
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to apply optimization';
      logger.error('Failed to apply optimization', { routeId, error: message });
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setIsApplying(false);
    }
  }, [routeId, result, reset, onSuccess, onError]);

  return {
    isOpen,
    isLoading,
    isApplying,
    error,
    result,
    originalOrder,
    companies,
    optimize,
    apply,
    close,
    reset,
  };
}
