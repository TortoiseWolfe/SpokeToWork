import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20251006_complete_monolithic_setup.sql'
  ),
  'utf8'
);

describe('Admin cross-user read RLS policies', () => {
  // Permissive-OR: these policies OR with the existing user-scoped ones.
  // The user-scoped policy text must stay byte-identical.

  it('private_companies has admin SELECT policy', () => {
    expect(migration).toContain(
      '"Admin can view all private companies" ON private_companies'
    );
    expect(migration).toContain(
      'FOR SELECT USING (\n    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)'
    );
  });

  it('user_company_tracking has admin SELECT policy', () => {
    expect(migration).toContain(
      '"Admin can view all tracking" ON user_company_tracking'
    );
  });

  it('bicycle_routes has admin SELECT policy (DO-block form)', () => {
    expect(migration).toContain("policyname = 'bicycle_routes_admin_select'");
    expect(migration).toContain(
      'bicycle_routes_admin_select ON bicycle_routes FOR SELECT'
    );
  });

  it('route_companies has admin SELECT policy (DO-block form)', () => {
    expect(migration).toContain("policyname = 'route_companies_admin_select'");
    expect(migration).toContain(
      'route_companies_admin_select ON route_companies FOR SELECT'
    );
  });

  it('user-scoped policies untouched', () => {
    // These lines must exist verbatim — proves we didn't weaken them
    expect(migration).toContain(
      'CREATE POLICY "Users can view own private companies" ON private_companies\n  FOR SELECT USING (auth.uid() = user_id);'
    );
    expect(migration).toContain(
      'CREATE POLICY "Users can view own tracking" ON user_company_tracking\n  FOR SELECT USING (auth.uid() = user_id);'
    );
  });
});
