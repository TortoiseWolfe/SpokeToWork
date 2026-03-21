/**
 * Company export format serializers.
 *
 * Each function converts flat ExportRow[] into a downloadable Blob.
 */

export interface ExportRow {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  status: string;
  priority: number;
  notes: string | null;
  source: string;
  is_verified: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  meeting: 'Meeting',
  outcome_positive: 'Positive',
  outcome_negative: 'Negative',
};

function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toCSV(rows: ExportRow[]): Blob {
  if (rows.length === 0) {
    return new Blob(['No companies to export'], { type: 'text/csv' });
  }
  const headers = Object.keys(rows[0]).join(',');
  const body = rows.map((row) =>
    Object.values(row)
      .map((v) => (v === null ? '' : `"${String(v).replace(/"/g, '""')}"`))
      .join(',')
  );
  return new Blob([[headers, ...body].join('\n')], { type: 'text/csv' });
}

export function toJSON(rows: ExportRow[]): Blob {
  return new Blob([JSON.stringify(rows, null, 2)], {
    type: 'application/json',
  });
}

export function toGPX(rows: ExportRow[]): Blob {
  const waypoints = rows
    .filter((c) => c.latitude && c.longitude)
    .map(
      (c) => `  <wpt lat="${c.latitude}" lon="${c.longitude}">
    <name>${escapeXML(c.name)}</name>
    <desc>${escapeXML(c.address || '')}</desc>
  </wpt>`
    );
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SpokeToWork">
${waypoints.join('\n')}
</gpx>`;
  return new Blob([gpx], { type: 'application/gpx+xml' });
}

export function toPrintableHTML(rows: ExportRow[]): Blob {
  const tableRows = rows
    .map(
      (c) => `    <tr>
      <td>${escapeXML(c.name)}</td>
      <td>${escapeXML(c.address || '-')}</td>
      <td>${escapeXML(c.contact_name || '-')}</td>
      <td>${escapeXML(c.phone || '-')}</td>
      <td>${STATUS_LABELS[c.status] || c.status}</td>
      <td>${c.priority}</td>
    </tr>`
    )
    .join('\n');
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Companies List</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Companies List</h1>
  <p>Generated: ${new Date().toLocaleDateString()}</p>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Address</th>
        <th>Contact</th>
        <th>Phone</th>
        <th>Status</th>
        <th>Priority</th>
      </tr>
    </thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
</body>
</html>`;
  return new Blob([html], { type: 'text/html' });
}
