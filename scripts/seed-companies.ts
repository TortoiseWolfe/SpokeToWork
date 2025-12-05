/**
 * Seed companies from master_job_tracker.csv
 * Run with: docker compose exec spoketowork npx tsx scripts/seed-companies.ts
 *
 * Uses Management API to bypass RLS
 */

import { readFileSync } from 'fs';

const PROJECT_REF = 'utxdunkaropkwnrqrsef';
const ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  'sbp_5ae9c1d7aee0ae94602c3054915e699a4eb8941b';
const USER_ID = '05ef57ea-65a8-4694-aff6-2d8ece3dd8e5';

async function executeSQL(query: string): Promise<unknown[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  return response.json();
}

function parsePriority(stars: string): number {
  // Scale 1-5: 1=highest, 5=lowest
  // ⭐⭐⭐=1 (highest), ⭐⭐=2, ⭐=3, no stars=5 (lowest)
  if (!stars) return 5;
  const count = (stars.match(/⭐/g) || []).length;
  if (count === 0) return 5;
  if (count === 1) return 3;
  if (count === 2) return 2;
  return 1; // 3 stars = highest priority
}

// Simple CSV parser that handles quoted fields
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });

    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

async function main() {
  console.log('Reading CSV file...');
  const csvContent = readFileSync('master_job_tracker.csv', 'utf-8');

  // Remove BOM if present
  const cleanContent = csvContent.replace(/^\uFEFF/, '');

  const records = parseCSV(cleanContent);
  console.log(`Found ${records.length} records`);

  // Filter to active companies only
  const activeCompanies = records.filter(
    (r) => r['Active']?.toLowerCase() === 'true'
  );
  console.log(`${activeCompanies.length} active companies to import`);

  console.log('Inserting companies via Management API...');

  let inserted = 0;

  for (const row of activeCompanies) {
    const name = (row['Company Name'] || 'Unknown').replace(/'/g, "''");
    const contactName = row['Contact Name']
      ? `'${row['Contact Name'].replace(/'/g, "''")}'`
      : 'NULL';
    const contactTitle = row['Title']
      ? `'${row['Title'].replace(/'/g, "''")}'`
      : 'NULL';
    const phone = row['Phone']
      ? `'${row['Phone'].replace(/'/g, "''")}'`
      : 'NULL';
    const email = row['Email']
      ? `'${row['Email'].replace(/'/g, "''")}'`
      : 'NULL';
    const website = row['Website']
      ? `'${row['Website'].replace(/'/g, "''")}'`
      : 'NULL';
    const address = row['Address']
      ? `'${row['Address'].replace(/'/g, "''")}'`
      : 'NULL';
    const latitude = row['Latitude'] ? parseFloat(row['Latitude']) : 'NULL';
    const longitude = row['Longitude'] ? parseFloat(row['Longitude']) : 'NULL';
    const priority = parsePriority(row['Priority']);
    const notesRaw = row['Notes']
      ? `${row['Notes']}${row['Route'] ? ' | Route: ' + row['Route'] : ''}`
      : row['Route'] || '';
    const notes = notesRaw ? `'${notesRaw.replace(/'/g, "''")}'` : 'NULL';

    const sql = `INSERT INTO companies (user_id, name, contact_name, contact_title, phone, email, website, address, latitude, longitude, status, priority, notes) VALUES ('${USER_ID}', '${name}', ${contactName}, ${contactTitle}, ${phone}, ${email}, ${website}, ${address}, ${latitude}, ${longitude}, 'not_contacted', ${priority}, ${notes}) RETURNING id`;

    try {
      const result = await executeSQL(sql);
      if (Array.isArray(result) && result.length > 0) {
        inserted++;
        if (inserted % 10 === 0) {
          console.log(`Inserted ${inserted} companies...`);
        }
      } else {
        console.error(`Failed to insert ${name}:`, result);
      }
    } catch (err) {
      console.error(`Error inserting ${name}:`, err);
    }
  }

  console.log(`\nDone! Inserted ${inserted} companies.`);
}

main().catch(console.error);
