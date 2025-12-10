/**
 * Route Export Utilities - Feature 041: Bicycle Route Planning
 *
 * Export route data in GPX, CSV, JSON, and printable HTML formats.
 *
 * @see specs/041-bicycle-route-planning/contracts/route-types.ts
 */

import type {
  BicycleRoute,
  RouteWithCompanies,
  RouteCompanyWithDetails,
  ExportFormat,
  ExportResult,
} from '@/types/route';

/**
 * Generate filename for export
 */
function generateFilename(routeName: string, format: ExportFormat): string {
  const sanitized = routeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'html' ? 'html' : format;
  return `${sanitized}-${date}.${extension}`;
}

/**
 * Export route to GPX format (GPS Exchange Format)
 */
export function exportToGPX(route: RouteWithCompanies): ExportResult {
  const waypoints = route.companies
    .map((rc, index) => {
      const lat = rc.company.latitude ?? 0;
      const lon = rc.company.longitude ?? 0;
      return `
    <wpt lat="${lat}" lon="${lon}">
      <name>${escapeXml(rc.company.name)}</name>
      <desc>${escapeXml(rc.company.address ?? '')}</desc>
      <sym>${rc.visit_on_next_ride ? 'Flag' : 'Waypoint'}</sym>
      <extensions>
        <sequence>${index + 1}</sequence>
        <nextRide>${rc.visit_on_next_ride}</nextRide>
      </extensions>
    </wpt>`;
    })
    .join('');

  // Create track from route geometry if available
  let track = '';
  if (route.route_geometry?.coordinates?.length) {
    const trackpoints = route.route_geometry.coordinates
      .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
      .join('\n');

    track = `
  <trk>
    <name>${escapeXml(route.name)}</name>
    <desc>${escapeXml(route.description ?? '')}</desc>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>`;
  }

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SpokeToWork"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <desc>${escapeXml(route.description ?? '')}</desc>
    <author>
      <name>SpokeToWork</name>
    </author>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypoints}
${track}
</gpx>`;

  return {
    format: 'gpx',
    filename: generateFilename(route.name, 'gpx'),
    content: gpx.trim(),
    mimeType: 'application/gpx+xml',
  };
}

/**
 * Export route to CSV format
 */
export function exportToCSV(route: RouteWithCompanies): ExportResult {
  const headers = [
    'route_name',
    'company_name',
    'address',
    'latitude',
    'longitude',
    'sequence',
    'next_ride',
    'source',
  ];

  const rows = route.companies.map((rc, index) => [
    escapeCSV(route.name),
    escapeCSV(rc.company.name),
    escapeCSV(rc.company.address ?? ''),
    rc.company.latitude?.toString() ?? '',
    rc.company.longitude?.toString() ?? '',
    (index + 1).toString(),
    rc.visit_on_next_ride ? 'yes' : 'no',
    rc.company.source,
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
    '\n'
  );

  return {
    format: 'csv',
    filename: generateFilename(route.name, 'csv'),
    content: csv,
    mimeType: 'text/csv',
  };
}

/**
 * Export route to JSON format
 */
export function exportToJSON(route: RouteWithCompanies): ExportResult {
  const exportData = {
    exportedAt: new Date().toISOString(),
    route: {
      id: route.id,
      name: route.name,
      description: route.description,
      color: route.color,
      start: {
        address: route.start_address,
        latitude: route.start_latitude,
        longitude: route.start_longitude,
      },
      end: {
        address: route.end_address,
        latitude: route.end_latitude,
        longitude: route.end_longitude,
      },
      geometry: route.route_geometry,
      distance_miles: route.distance_miles,
      estimated_time_minutes: route.estimated_time_minutes,
    },
    companies: route.companies.map((rc, index) => ({
      sequence: index + 1,
      name: rc.company.name,
      address: rc.company.address,
      latitude: rc.company.latitude,
      longitude: rc.company.longitude,
      source: rc.company.source,
      next_ride: rc.visit_on_next_ride,
    })),
    summary: {
      total_companies: route.company_count,
      next_ride_count: route.companies.filter((c) => c.visit_on_next_ride)
        .length,
    },
  };

  return {
    format: 'json',
    filename: generateFilename(route.name, 'json'),
    content: JSON.stringify(exportData, null, 2),
    mimeType: 'application/json',
  };
}

/**
 * Export route to printable HTML format
 */
export function exportToHTML(route: RouteWithCompanies): ExportResult {
  const companiesHTML = route.companies
    .map(
      (rc, index) => `
    <tr class="${rc.visit_on_next_ride ? 'next-ride' : ''}">
      <td class="sequence">${index + 1}</td>
      <td class="name">${escapeHtml(rc.company.name)}</td>
      <td class="address">${escapeHtml(rc.company.address ?? '-')}</td>
      <td class="next-ride-flag">${rc.visit_on_next_ride ? '&#10004;' : ''}</td>
    </tr>
  `
    )
    .join('');

  const nextRideCount = route.companies.filter(
    (c) => c.visit_on_next_ride
  ).length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(route.name)} - Route Details</title>
  <style>
    @media print {
      body { font-size: 12pt; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: ${route.color};
      border-bottom: 3px solid ${route.color};
      padding-bottom: 10px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 0.8em;
      color: #666;
      text-transform: uppercase;
    }
    .meta-value {
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
    }
    tr.next-ride {
      background: #e8f5e9;
    }
    .sequence {
      width: 50px;
      text-align: center;
      font-weight: bold;
      color: ${route.color};
    }
    .next-ride-flag {
      width: 80px;
      text-align: center;
      color: #4caf50;
      font-size: 1.2em;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
      color: #666;
      text-align: center;
    }
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: ${route.color};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(route.name)}</h1>

  ${route.description ? `<p>${escapeHtml(route.description)}</p>` : ''}

  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Start</span>
      <span class="meta-value">${escapeHtml(route.start_address ?? 'Not specified')}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">End</span>
      <span class="meta-value">${escapeHtml(route.end_address ?? 'Not specified')}</span>
    </div>
    ${
      route.distance_miles
        ? `
    <div class="meta-item">
      <span class="meta-label">Distance</span>
      <span class="meta-value">${route.distance_miles} miles</span>
    </div>`
        : ''
    }
    <div class="meta-item">
      <span class="meta-label">Companies</span>
      <span class="meta-value">${route.company_count}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Next Ride</span>
      <span class="meta-value">${nextRideCount} marked</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Company</th>
        <th>Address</th>
        <th>Next Ride</th>
      </tr>
    </thead>
    <tbody>
      ${companiesHTML}
    </tbody>
  </table>

  <div class="footer">
    Exported from SpokeToWork on ${new Date().toLocaleDateString()}
  </div>

  <button class="print-btn no-print" onclick="window.print()">Print</button>
</body>
</html>`;

  return {
    format: 'html',
    filename: generateFilename(route.name, 'html'),
    content: html,
    mimeType: 'text/html',
  };
}

/**
 * Export route in specified format
 */
export function exportRoute(
  route: RouteWithCompanies,
  format: ExportFormat
): ExportResult {
  switch (format) {
    case 'gpx':
      return exportToGPX(route);
    case 'csv':
      return exportToCSV(route);
    case 'json':
      return exportToJSON(route);
    case 'html':
      return exportToHTML(route);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Trigger download of export result
 */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Escape special characters for XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Escape special characters for HTML
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
