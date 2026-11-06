#!/usr/bin/env tsx
/**
 * Supabase Priming Script
 *
 * Wakes up Supabase Cloud instance after auto-pause (free tier pauses after 1 week of inactivity).
 * First request after pause takes 10-30 seconds as the database wakes up.
 *
 * Usage: pnpm run prime
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function primeSupabase() {
  // Validate environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.error(
      '   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    console.error('   Check your .env file');
    process.exit(1);
  }

  console.log('🔄 Priming Supabase cloud instance...');
  console.log(`   URL: ${supabaseUrl}`);

  const start = Date.now();

  try {
    // A hung connection must fail the run, not sit until the job's timeout.
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(60_000) }),
      },
    });

    // Execute an actual database query to wake up the instance. The table is
    // user_profiles unless PRIME_TABLE overrides it (the keep-alive workflow's
    // manual "probe_table" input uses that to prove the job can go red).
    const table = process.env.PRIME_TABLE || 'user_profiles';
    const { error, status } = await supabase
      .from(table)
      .select('count')
      .limit(1);

    const duration = Date.now() - start;
    console.log(`   GET /rest/v1/${table}: HTTP ${status} in ${duration}ms`);

    if (error) {
      throw new Error(
        `Database query failed (HTTP ${status}): ${error.message}`
      );
    }
    if (status !== 200) {
      throw new Error(`Expected HTTP 200, got ${status}`);
    }

    // Interpret the duration
    if (duration > 5000) {
      console.log(
        `✅ Supabase ready (${duration}ms - instance was paused, now awake)`
      );
    } else {
      console.log(
        `✅ Supabase ready (${duration}ms - instance was already active)`
      );
    }

    console.log('   Subsequent requests should be fast (<500ms)');
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Failed to prime Supabase (${duration}ms)`);

    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error(`   Error: ${String(error)}`);
    }

    console.error('\n   Troubleshooting:');
    console.error('   1. Check your internet connection');
    console.error('   2. Verify .env file has correct Supabase credentials');
    console.error(
      '   3. Check Supabase project status at https://supabase.com/dashboard'
    );
    console.error(
      '   4. Free tier projects pause after 1 week - this wake-up can take 30+ seconds'
    );

    process.exit(1);
  }
}

// Run the priming function
primeSupabase();
