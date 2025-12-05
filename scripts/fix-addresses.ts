/**
 * Fix addresses for companies that couldn't be geocoded
 * Run with: docker compose exec spoketowork npx tsx scripts/fix-addresses.ts
 */

const PROJECT_REF = 'utxdunkaropkwnrqrsef';
const ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  'sbp_5ae9c1d7aee0ae94602c3054915e699a4eb8941b';

interface AddressFix {
  id: string;
  name: string;
  oldAddress: string;
  newAddress: string;
}

// Researched address corrections
const addressFixes: AddressFix[] = [
  {
    id: '3baf229e-1f9c-4b32-bfb3-7b0531eb8a8b',
    name: 'Amazon Fulfillment Center CHA2',
    oldAddress: 'Charleston, TN (Hiwassee River Industrial Park)',
    newAddress: '225 Infinity Dr, Charleston, TN 37310',
  },
  {
    id: 'a688dbf6-95a4-4701-aeae-a7aed873e726',
    name: 'Cars & Credit',
    oldAddress: '120 Brent Dr SW, Cleveland, TN 37311',
    newAddress: '110 Keith St NW, Cleveland, TN 37311',
  },
  {
    id: '7b15c464-4cc7-41ad-820f-6df24981b7c4',
    name: 'Jackson Furniture Industries',
    oldAddress: '180 Industrial Ln SE, Cleveland, TN 37311',
    newAddress: '1910 King Edward Ave SE, Cleveland, TN 37311',
  },
  {
    id: 'b3a2636c-e225-423b-949d-e45b42306eb8',
    name: 'JHM Certified Public Accountants',
    oldAddress: 'Cleveland, TN (Chattanooga-based)',
    newAddress: '1040 William Way NW, Cleveland, TN 37312',
  },
  {
    id: '6cb88928-4c7b-4a0b-9939-d7d964e22719',
    name: 'Law Office of Jack W. Tapper',
    oldAddress: 'Old Tasso Road & Stuart Road, Cleveland, TN 37312',
    newAddress: '1510 Stuart Rd NE, Cleveland, TN 37312',
  },
  {
    id: 'f5878085-43a3-4341-91af-f93ff1c95e4a',
    name: 'Bradley County Government',
    oldAddress: '155 N Ocoee Street, Suite 104, Cleveland, TN 37311',
    newAddress: '155 N Ocoee St, Cleveland, TN 37311',
  },
  {
    id: 'd9c3b368-cc0d-4eda-85a8-bc88b776c88c',
    name: 'Bradley Urgent Care',
    oldAddress: '4021 Keith Street NW, Cleveland, TN 37312',
    newAddress: '4021 Keith St NW, Cleveland, TN 37312',
  },
  {
    id: 'cdf1fc09-956a-4a97-89c5-bfb45ead355b',
    name: 'Bradley Walk-In Clinic - North',
    oldAddress: '1060 Peerless Crossing, 2nd Floor, Cleveland, TN 37312',
    newAddress: '1060 Peerless Crossing NW, Cleveland, TN 37312',
  },
  {
    id: '2245a1ea-5e59-49b4-b29a-2deb8d214150',
    name: 'Derby Supply Chain Solutions',
    oldAddress: '3285 Davy Crockett Drive, Cleveland, TN 37323',
    newAddress: '3285 Davy Crockett Dr NE, Cleveland, TN 37323',
  },
  {
    id: 'cf7a2fd2-fd83-4652-bed4-265bf7b2950d',
    name: 'El Don Mexican',
    oldAddress: '270 S. Ocoee St. SE, Cleveland, TN 37311',
    newAddress: '270 S Ocoee St, Cleveland, TN 37311',
  },
  {
    id: 'cbb0875a-9396-4b7a-be1b-ebe4ba5ea0f8',
    name: 'Central Heat and Air Co.',
    oldAddress: '3160 Frazier Park Drive NE, Cleveland, TN 37323',
    newAddress: '3160 Frazier Park Dr NE, Cleveland, TN 37323',
  },
  {
    id: '45a4397b-fe58-4620-bbee-82e9c59f516b',
    name: 'Bradley Tank & Pipe LLC',
    oldAddress: '185 Boss Rd, McDonald, TN 37353',
    newAddress: '185 Boss Road, McDonald, TN 37353',
  },
  {
    id: 'fbe4e8b7-6a71-4fbe-8027-5c20d3b47723',
    name: 'Lubing Systems LP',
    oldAddress: '135 Corporate Dr SW, Cleveland, TN 37311',
    newAddress: '135 Corporate Dr, Cleveland, TN 37311',
  },
  {
    id: '0e731fd3-a3fc-425e-ba3d-81224a28b38e',
    name: 'Tri-State Truss Co. LLC',
    oldAddress: '1198 51st St NE, Cleveland, TN 37311',
    newAddress: '1198 51st St NE, Cleveland, TN 37312',
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

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

async function main() {
  console.log('Updating addresses for companies that failed geocoding...\n');

  let updated = 0;
  let failed = 0;

  for (const fix of addressFixes) {
    try {
      const sql = `UPDATE companies SET address = '${escapeSQL(fix.newAddress)}' WHERE id = '${fix.id}'`;
      await executeSQL(sql);
      console.log(`  ✓ ${fix.name}`);
      console.log(`      Old: ${fix.oldAddress}`);
      console.log(`      New: ${fix.newAddress}`);
      updated++;
    } catch (error) {
      console.log(`  ✗ Failed to update ${fix.name}: ${error}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('Done!');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log('========================================');
  console.log(
    '\nNow run geocode-companies.ts to geocode the updated addresses.'
  );
}

main().catch(console.error);
