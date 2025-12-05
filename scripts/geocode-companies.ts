/**
 * Geocode companies with NULL coordinates using Nominatim
 * Run with: docker compose exec spoketowork npx tsx scripts/geocode-companies.ts
 *
 * Nominatim rate limit: 1 request per second
 */

const PROJECT_REF = 'utxdunkaropkwnrqrsef';
const ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  'sbp_5ae9c1d7aee0ae94602c3054915e699a4eb8941b';

interface Company {
  id: string;
  name: string;
  address: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function executeSQL(sql: string): Promise<unknown[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const data = await response.json();
  if (data.message) {
    throw new Error(data.message);
  }
  return data;
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'SpokeToWork/1.0 (https://github.com/TurtleWolfe/SpokeToWork)',
      },
    });

    if (!response.ok) {
      console.log(
        `  ⚠ Nominatim returned ${response.status} for "${address}"`
      );
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    };
  } catch (error) {
    console.log(`  ⚠ Error geocoding "${address}": ${error}`);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching companies with NULL coordinates...\n');

  const companies = (await executeSQL(
    `SELECT id, name, address FROM companies WHERE latitude IS NULL OR longitude IS NULL ORDER BY name`
  )) as Company[];

  console.log(`Found ${companies.length} companies to geocode\n`);

  let geocoded = 0;
  let failed = 0;

  for (const company of companies) {
    process.stdout.write(`Geocoding: ${company.name}... `);

    const coords = await geocodeAddress(company.address);

    if (coords) {
      // Update the company with coordinates
      const updateSQL = `UPDATE companies SET latitude = ${coords.lat}, longitude = ${coords.lng} WHERE id = '${company.id}'`;
      await executeSQL(updateSQL);
      console.log(`✓ (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      geocoded++;
    } else {
      console.log(`✗ (no results for "${company.address}")`);
      failed++;
    }

    // Rate limit: 1 request per second for Nominatim
    await sleep(1100);
  }

  console.log('\n========================================');
  console.log('Done!');
  console.log(`  Geocoded: ${geocoded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${companies.length}`);
  console.log('========================================');
}

main().catch(console.error);
