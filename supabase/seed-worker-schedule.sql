-- Seed: worker schedule + time tracking demo (Feature 067)
--
-- Creates a worker assigned to shifts at two restaurants in one metro.
-- One shift is clock-in-able immediately (start_time pinned just before
-- the seed runs), one runs concurrently at the other restaurant so the
-- overlap check has something to reject.
--
-- Idempotent: deletes its own rows by fixed UUID before inserting.
-- Run: applied automatically by ./scripts/supabase-up.sh (seed*.sql glob).

DO $$
DECLARE
  v_metro_id   UUID := '00000067-0000-0000-0000-000000000001';
  v_co_a_id    UUID := '00000067-0000-0000-0000-00000000000a';
  v_co_b_id    UUID := '00000067-0000-0000-0000-00000000000b';
  v_employer   UUID := '00000067-0000-0000-0000-0000000000e1';
  v_worker     UUID := '00000067-0000-0000-0000-0000000000a1';
  v_shift_now  UUID := '00000067-0000-0000-0001-000000000001';
  v_shift_lap  UUID := '00000067-0000-0000-0001-000000000002';
  v_today      DATE := CURRENT_DATE;
  -- Local wall-clock time in the metro's tz, snapped to the previous quarter-hour.
  -- Keeps "5 min ago" stable across re-runs and looks tidy in the UI.
  v_now_local  TIME := date_trunc('hour', (NOW() AT TIME ZONE 'America/New_York'))::TIME
                       + (FLOOR(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'America/New_York')) / 15) * INTERVAL '15 minutes');
BEGIN
  -- Clean prior run. Cascade order: time_entries → shifts → links → users.
  DELETE FROM time_entries WHERE user_id = v_worker;
  DELETE FROM team_shifts WHERE company_id IN (v_co_a_id, v_co_b_id);
  DELETE FROM team_members WHERE company_id IN (v_co_a_id, v_co_b_id);
  DELETE FROM employer_company_links WHERE user_id = v_employer;
  DELETE FROM shared_companies WHERE id IN (v_co_a_id, v_co_b_id);
  DELETE FROM metro_areas WHERE id = v_metro_id;
  DELETE FROM auth.users WHERE id IN (v_worker, v_employer);

  -- Metro with explicit timezone (the column we just added in W001).
  INSERT INTO metro_areas (id, name, state, center_lat, center_lng, radius_miles, timezone)
  VALUES (v_metro_id, 'Brooklyn (demo)', 'NY', 40.6782, -73.9442, 15, 'America/New_York');

  INSERT INTO shared_companies (id, metro_area_id, name, is_verified)
  VALUES
    (v_co_a_id, v_metro_id, 'Joe''s Pizza (demo)', TRUE),
    (v_co_b_id, v_metro_id, 'Maria''s Tacos (demo)', TRUE);

  -- Auth users. Empty-string tokens per GoTrue requirement (CLAUDE.md).
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
    (v_worker,   '00000000-0000-0000-0000-000000000000',
     'worker.demo@example.com', crypt('WorkerDemo!2026', gen_salt('bf')),
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}',
     FALSE, 'authenticated', 'authenticated', '', '', '', ''),
    (v_employer, '00000000-0000-0000-0000-000000000000',
     'employer.demo@example.com', crypt('EmployerDemo!2026', gen_salt('bf')),
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}',
     FALSE, 'authenticated', 'authenticated', '', '', '', '');

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  )
  SELECT gen_random_uuid(), id, email, 'email',
         jsonb_build_object('sub', id::TEXT, 'email', email, 'email_verified', TRUE),
         NOW(), NOW(), NOW()
  FROM auth.users WHERE id IN (v_worker, v_employer);

  -- Profiles. Some installs auto-create profiles via trigger; upsert covers both.
  INSERT INTO user_profiles (id, display_name, role)
  VALUES
    (v_worker,   'Demo Worker',   'worker'),
    (v_employer, 'Demo Employer', 'employer')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role;

  -- Employer manages both restaurants.
  INSERT INTO employer_company_links (user_id, shared_company_id)
  VALUES (v_employer, v_co_a_id), (v_employer, v_co_b_id);

  -- Worker is on both rosters.
  INSERT INTO team_members (company_id, user_id, name, email, role_title, added_by)
  VALUES
    (v_co_a_id, v_worker, 'Demo Worker', 'worker.demo@example.com', 'Bike Courier', v_employer),
    (v_co_b_id, v_worker, 'Demo Worker', 'worker.demo@example.com', 'Bike Courier', v_employer);

  -- Shifts.
  --   #1 at Joe's: started just before now → clock-in is open.
  --   #2 at Maria's: same window → clock-in attempt should hit "Already
  --   clocked in at Joe's Pizza (demo)" once #1 has an open entry.
  --   Plus a few across the week so the schedule looks like a schedule.
  INSERT INTO team_shifts (id, company_id, user_id, shift_date, start_time, end_time, shift_type, notes, created_by)
  VALUES
    (v_shift_now, v_co_a_id, v_worker, v_today, v_now_local,
     LEAST(v_now_local + INTERVAL '4 hours', '23:59'::TIME),
     'regular', 'Lunch rush (clock-in demo target)', v_employer),
    (v_shift_lap, v_co_b_id, v_worker, v_today, v_now_local,
     LEAST(v_now_local + INTERVAL '4 hours', '23:59'::TIME),
     'regular', 'Overlap demo — should be rejected', v_employer);

  INSERT INTO team_shifts (company_id, user_id, shift_date, start_time, end_time, shift_type, created_by)
  VALUES
    (v_co_a_id, v_worker, v_today + 1, '09:00', '13:00', 'regular',  v_employer),
    (v_co_b_id, v_worker, v_today + 1, '15:00', '19:00', 'regular',  v_employer),
    (v_co_a_id, v_worker, v_today + 3, '11:00', '15:00', 'training', v_employer),
    (v_co_b_id, v_worker, v_today + 5, '17:00', '21:00', 'on_call',  v_employer);

  RAISE NOTICE 'Seeded worker schedule. Worker: % / WorkerDemo!2026', 'worker.demo@example.com';
  RAISE NOTICE 'Clock-in target shift: % at Joe''s, today % at % (America/New_York)',
    v_shift_now, v_today, v_now_local;
END $$;
