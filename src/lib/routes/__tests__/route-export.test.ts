/**
 * Unit Tests for route-export.ts
 * Feature 052 - Test Coverage Expansion
 *
 * Tests export functionality for GPX, CSV, JSON, and HTML formats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportToGPX,
  exportToCSV,
  exportToJSON,
  exportToHTML,
  exportRoute,
  downloadExport,
} from '../route-export';
import type { RouteWithCompanies } from '@/types/route';

// Mock URL and Blob for download functionality
const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
const mockRevokeObjectURL = vi.fn();

global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('route-export', () => {
  const mockRoute: RouteWithCompanies = {
    id: 'route-123',
    name: 'Test Route',
    description: 'A test bicycle route',
    user_id: 'user-123',
    metro_area_id: null,
    color: '#FF0000',
    start_address: '123 Start St',
    start_latitude: 35.044,
    start_longitude: -85.255,
    end_address: '456 End Ave',
    end_latitude: 35.046,
    end_longitude: -85.257,
    distance_miles: 1.5,
    estimated_time_minutes: 10,
    is_system_route: false,
    source_name: null,
    is_active: true,
    start_type: 'home',
    end_type: 'home',
    is_round_trip: true,
    last_optimized_at: null,
    company_count: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    companies: [
      {
        id: 'rc-1',
        route_id: 'route-123',
        user_id: 'user-123',
        shared_company_id: null,
        private_company_id: 'company-1',
        tracking_id: null,
        sequence_order: 1,
        visit_on_next_ride: true,
        distance_from_start_miles: 0,
        created_at: '2024-01-01T00:00:00Z',
        company: {
          id: 'company-1',
          name: 'Test Company 1',
          address: '123 Main St',
          latitude: 35.044,
          longitude: -85.255,
          source: 'private',
        } as RouteWithCompanies['companies'][0]['company'],
      },
      {
        id: 'rc-2',
        route_id: 'route-123',
        user_id: 'user-123',
        shared_company_id: null,
        private_company_id: 'company-2',
        tracking_id: null,
        sequence_order: 2,
        visit_on_next_ride: false,
        distance_from_start_miles: 1.5,
        created_at: '2024-01-01T00:00:00Z',
        company: {
          id: 'company-2',
          name: 'Test Company 2',
          address: '456 Oak Ave',
          latitude: 35.046,
          longitude: -85.257,
          source: 'private',
        } as RouteWithCompanies['companies'][0]['company'],
      },
    ],
    route_geometry: {
      type: 'LineString',
      coordinates: [
        [-85.255, 35.044],
        [-85.257, 35.046],
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToGPX()', () => {
    it('should generate valid GPX XML', () => {
      const result = exportToGPX(mockRoute);

      expect(result.content).toContain('<?xml version="1.0"');
      expect(result.content).toContain('<gpx version="1.1"');
      expect(result.content).toContain('</gpx>');
      expect(result.mimeType).toBe('application/gpx+xml');
    });

    it('should include route metadata', () => {
      const result = exportToGPX(mockRoute);

      expect(result.content).toContain('<name>Test Route</name>');
      expect(result.content).toContain('<desc>A test bicycle route</desc>');
    });

    it('should include waypoints for each company', () => {
      const result = exportToGPX(mockRoute);

      expect(result.content).toContain('lat="35.044"');
      expect(result.content).toContain('lon="-85.255"');
      expect(result.content).toContain('<name>Test Company 1</name>');
      expect(result.content).toContain('<name>Test Company 2</name>');
    });

    it('should include track from geometry', () => {
      const result = exportToGPX(mockRoute);

      expect(result.content).toContain('<trk>');
      expect(result.content).toContain('<trkpt');
      expect(result.content).toContain('</trkseg>');
    });

    it('should generate correct filename', () => {
      const result = exportToGPX(mockRoute);

      expect(result.filename).toMatch(/^test-route-\d{4}-\d{2}-\d{2}\.gpx$/);
    });
  });

  describe('exportToCSV()', () => {
    it('should generate valid CSV', () => {
      const result = exportToCSV(mockRoute);

      expect(result.mimeType).toBe('text/csv');
      expect(result.content).toContain(','); // Has delimiters
    });

    it('should include header row with snake_case columns', () => {
      const result = exportToCSV(mockRoute);

      // First line should be headers
      const firstLine = result.content.split('\n')[0];
      expect(firstLine).toContain('route_name');
      expect(firstLine).toContain('company_name');
      expect(firstLine).toContain('address');
    });

    it('should include company data', () => {
      const result = exportToCSV(mockRoute);

      expect(result.content).toContain('Test Company 1');
      expect(result.content).toContain('123 Main St');
      expect(result.content).toContain('Test Company 2');
    });

    it('should escape commas in values', () => {
      const routeWithCommas = {
        ...mockRoute,
        companies: [
          {
            ...mockRoute.companies[0],
            company: {
              ...mockRoute.companies[0].company,
              name: 'Company, Inc.',
            },
          },
        ],
      };

      const result = exportToCSV(routeWithCommas);

      // Should be quoted to escape comma
      expect(result.content).toContain('"Company, Inc."');
    });
  });

  describe('exportToJSON()', () => {
    it('should generate valid JSON', () => {
      const result = exportToJSON(mockRoute);

      expect(result.mimeType).toBe('application/json');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it('should include route data', () => {
      const result = exportToJSON(mockRoute);
      const parsed = JSON.parse(result.content);

      expect(parsed.route.name).toBe('Test Route');
      expect(parsed.companies).toHaveLength(2);
    });

    it('should format JSON for readability', () => {
      const result = exportToJSON(mockRoute);

      // Should have newlines (pretty printed)
      expect(result.content).toContain('\n');
    });
  });

  describe('exportToHTML()', () => {
    it('should generate HTML document', () => {
      const result = exportToHTML(mockRoute);

      expect(result.mimeType).toBe('text/html');
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('</html>');
    });

    it('should include route name in title', () => {
      const result = exportToHTML(mockRoute);

      expect(result.content).toContain('<title>Test Route');
    });

    it('should include company list', () => {
      const result = exportToHTML(mockRoute);

      expect(result.content).toContain('Test Company 1');
      expect(result.content).toContain('Test Company 2');
    });

    it('should include print styles', () => {
      const result = exportToHTML(mockRoute);

      expect(result.content).toContain('@media print');
    });
  });

  describe('exportRoute()', () => {
    it('should export to GPX format', () => {
      const result = exportRoute(mockRoute, 'gpx');
      expect(result.format).toBe('gpx');
    });

    it('should export to CSV format', () => {
      const result = exportRoute(mockRoute, 'csv');
      expect(result.format).toBe('csv');
    });

    it('should export to JSON format', () => {
      const result = exportRoute(mockRoute, 'json');
      expect(result.format).toBe('json');
    });

    it('should export to HTML format', () => {
      const result = exportRoute(mockRoute, 'html');
      expect(result.format).toBe('html');
    });

    it('should throw for unsupported format', () => {
      expect(() => exportRoute(mockRoute, 'unknown' as never)).toThrow(
        'Unsupported export format'
      );
    });
  });

  describe('downloadExport()', () => {
    it('should create blob URL and trigger download', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockLink as unknown as HTMLAnchorElement
      );
      vi.spyOn(document.body, 'appendChild').mockImplementation(
        () => mockLink as unknown as HTMLAnchorElement
      );
      vi.spyOn(document.body, 'removeChild').mockImplementation(
        () => mockLink as unknown as HTMLAnchorElement
      );

      const exportResult = {
        format: 'gpx' as const,
        content: '<gpx>test</gpx>',
        filename: 'test.gpx',
        mimeType: 'application/gpx+xml',
      };

      downloadExport(exportResult);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
