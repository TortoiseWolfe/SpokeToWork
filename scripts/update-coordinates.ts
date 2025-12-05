/**
 * Directly update coordinates for companies that couldn't be geocoded
 * Coordinates obtained from web research
 * Run with: docker compose exec spoketowork npx tsx scripts/update-coordinates.ts
 */

const PROJECT_REF = 'utxdunkaropkwnrqrsef';
const ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  'sbp_5ae9c1d7aee0ae94602c3054915e699a4eb8941b';

interface CoordinateUpdate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  source: string;
}

// Researched coordinates from web searches
const coordinateUpdates: CoordinateUpdate[] = [
  // From mapsus.net search result
  {
    id: '3baf229e-1f9c-4b32-bfb3-7b0531eb8a8b',
    name: 'Amazon Fulfillment Center CHA2',
    latitude: 35.2827,
    longitude: -84.8122,
    source: 'mapsus.net/warehouse.ninja',
  },
  // From Trulia/WACKER corporate site
  {
    id: '0602abfa-6ad4-4e54-8832-be5702f711dd',
    name: 'WACKER POLYSILICON North America',
    latitude: 35.2935,
    longitude: -84.7935,
    source: 'trulia.com/wacker.com',
  },
  // Estimated from Keith Street Ministries at 4000 Keith St NW
  {
    id: 'd9c3b368-cc0d-4eda-85a8-bc88b776c88c',
    name: 'Bradley Urgent Care',
    latitude: 35.1968,
    longitude: -84.8523,
    source: 'estimated from nearby 4000 Keith St NW',
  },
  // Spring Branch Industrial Park area (ZIP 37353 center)
  {
    id: '8be6732c-a90f-4e4a-96d6-daaeaa4d35db',
    name: 'Amaero Advanced Materials',
    latitude: 35.1133,
    longitude: -84.983,
    source: 'Spring Branch Industrial Park ZIP center',
  },
  {
    id: '0fe88084-62de-4163-93ce-a1bc0db66e88',
    name: 'Cleveland Cliffs',
    latitude: 35.114,
    longitude: -84.982,
    source: 'Spring Branch Industrial Park ZIP center',
  },
  {
    id: 'e42dbf15-12fe-4b0f-accd-fd1e56277f51',
    name: 'SK Food Group',
    latitude: 35.1145,
    longitude: -84.981,
    source: 'Spring Branch Industrial Park ZIP center',
  },
  // Cars & Credit - Keith St NW area
  {
    id: 'a688dbf6-95a4-4701-aeae-a7aed873e726',
    name: 'Cars & Credit',
    latitude: 35.1627,
    longitude: -84.8726,
    source: 'estimated from Keith St area',
  },
  // Central Asphalt - Ladd Springs Rd SE area
  {
    id: '5810de32-5597-4dd2-bcfe-9a527e57580a',
    name: 'Central Asphalt Inc.',
    latitude: 35.132,
    longitude: -84.838,
    source: 'estimated from Ladd Springs area',
  },
  // Central Heat and Air - Frazier Park Dr NE
  {
    id: 'cbb0875a-9396-4b7a-be1b-ebe4ba5ea0f8',
    name: 'Central Heat and Air Co.',
    latitude: 35.192,
    longitude: -84.815,
    source: 'estimated from Frazier Park area',
  },
  // Derby Supply Chain - Davy Crockett area
  {
    id: '2245a1ea-5e59-49b4-b29a-2deb8d214150',
    name: 'Derby Supply Chain Solutions',
    latitude: 35.145,
    longitude: -84.828,
    source: 'estimated from Davy Crockett Dr area',
  },
  // Bradley Tank & Pipe - Boss Road McDonald
  {
    id: '45a4397b-fe58-4620-bbee-82e9c59f516b',
    name: 'Bradley Tank & Pipe LLC',
    latitude: 35.106,
    longitude: -84.965,
    source: 'estimated from Boss Rd McDonald area',
  },
  // JHM CPAs - William Way NW
  {
    id: 'b3a2636c-e225-423b-949d-e45b42306eb8',
    name: 'JHM Certified Public Accountants',
    latitude: 35.188,
    longitude: -84.868,
    source: 'estimated from William Way NW area',
  },
  // Tri-State Truss - 51st St NE
  {
    id: '0e731fd3-a3fc-425e-ba3d-81224a28b38e',
    name: 'Tri-State Truss Co. LLC',
    latitude: 35.21,
    longitude: -84.825,
    source: 'estimated from 51st St NE area',
  },
  // Woodway Inc - No Pone Rd Georgetown
  {
    id: 'e75ef34d-d0c5-4013-ae37-cf47044dae06',
    name: 'Woodway Inc.',
    latitude: 35.295,
    longitude: -84.942,
    source: 'estimated from No Pone Rd Georgetown area',
  },
];

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

async function main() {
  console.log('Updating coordinates from web research...\n');

  let updated = 0;
  let failed = 0;

  for (const update of coordinateUpdates) {
    try {
      const sql = `UPDATE companies SET latitude = ${update.latitude}, longitude = ${update.longitude} WHERE id = '${update.id}'`;
      await executeSQL(sql);
      console.log(`  ✓ ${update.name}`);
      console.log(`      Coords: ${update.latitude}, ${update.longitude}`);
      console.log(`      Source: ${update.source}`);
      updated++;
    } catch (error) {
      console.log(`  ✗ Failed to update ${update.name}: ${error}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('Done!');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log('========================================');
}

main().catch(console.error);
