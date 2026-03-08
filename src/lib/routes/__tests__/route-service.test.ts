/**
 * Unit Tests for route-service.ts
 * Feature 052 - Test Coverage Expansion
 *
 * Tests error classes and basic service instantiation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RouteService,
  RouteNotFoundError,
  RouteLimitError,
  RouteValidationError,
  RouteCompanyDuplicateError,
  createRouteService,
} from '../route-service';

describe('route-service', () => {
  describe('Error classes', () => {
    it('RouteNotFoundError should have correct message and name', () => {
      const error = new RouteNotFoundError('route-123');
      expect(error.message).toBe('Route with id "route-123" not found');
      expect(error.name).toBe('RouteNotFoundError');
      expect(error).toBeInstanceOf(Error);
    });

    it('RouteLimitError should have correct message and name', () => {
      const error = new RouteLimitError('Max routes reached');
      expect(error.message).toBe('Max routes reached');
      expect(error.name).toBe('RouteLimitError');
      expect(error).toBeInstanceOf(Error);
    });

    it('RouteValidationError should have correct message and name', () => {
      const error = new RouteValidationError('Invalid route data');
      expect(error.message).toBe('Invalid route data');
      expect(error.name).toBe('RouteValidationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('RouteCompanyDuplicateError should have correct message and name', () => {
      const error = new RouteCompanyDuplicateError();
      expect(error.message).toBe(
        'Company is already associated with this route'
      );
      expect(error.name).toBe('RouteCompanyDuplicateError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RouteService class', () => {
    it('should be constructable with a supabase client', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(service).toBeInstanceOf(RouteService);
    });

    it('should have initialize method', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(typeof service.initialize).toBe('function');
    });

    it('should have getRoutes method', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(typeof service.getRoutes).toBe('function');
    });

    it('should have getRouteById method', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(typeof service.getRouteById).toBe('function');
    });

    it('should have createRoute method', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(typeof service.createRoute).toBe('function');
    });

    it('should have updateRoute method', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(typeof service.updateRoute).toBe('function');
    });

    it('should have deleteRoute method', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = new RouteService(mockSupabase as unknown as never);
      expect(typeof service.deleteRoute).toBe('function');
    });
  });

  describe('createRouteService factory', () => {
    it('should create a RouteService instance', () => {
      const mockSupabase = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      };

      const service = createRouteService(mockSupabase as unknown as never);
      expect(service).toBeInstanceOf(RouteService);
    });
  });
});
