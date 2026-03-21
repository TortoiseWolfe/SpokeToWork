/**
 * Company Export — public API.
 *
 * Converts UnifiedCompany lists into downloadable blobs.
 * Format serializers live in export-formats.ts.
 */

import type { UnifiedCompany } from '@/types/company';
import type { ExportFormat } from '@/components/molecular/CompanyExport';
import {
  type ExportRow,
  toCSV,
  toJSON,
  toGPX,
  toPrintableHTML,
} from './export-formats';

function toExportRows(companies: UnifiedCompany[]): ExportRow[] {
  return companies.map((c) => ({
    name: c.name,
    address: c.address,
    latitude: c.latitude,
    longitude: c.longitude,
    website: c.website,
    phone: c.phone,
    email: c.email,
    contact_name: c.contact_name,
    status: c.status,
    priority: c.priority,
    notes: c.notes,
    source: c.source,
    is_verified: c.is_verified,
  }));
}

/**
 * Serialize a list of companies into a Blob for download.
 * Throws on unknown format (should never happen — ExportFormat is exhaustive).
 */
export function exportCompanies(
  companies: UnifiedCompany[],
  format: ExportFormat
): Blob {
  const rows = toExportRows(companies);
  switch (format) {
    case 'csv':
      return toCSV(rows);
    case 'json':
      return toJSON(rows);
    case 'gpx':
      return toGPX(rows);
    case 'printable':
      return toPrintableHTML(rows);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}
