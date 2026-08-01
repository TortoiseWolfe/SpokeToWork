# RLS / authorization boundary tests

These talk to PostgREST directly with real user JWTs, which is the only way to
test this layer. The application's own code is careful — it uses explicit column
lists and never asks for the fields these tests probe — so a bug here is
invisible to every component test, every E2E run, and every click through the UI.

## Why these exist

Postgres RLS is **row**-level. A policy decides which _rows_ a role may touch and
says nothing about which _columns_. Column authorization is the `GRANT`'s job.

Three real vulnerabilities came from that gap, all with correct-looking policies:

1. `is_admin` and `role` were ordinary columns on `user_profiles`, under a
   blanket `GRANT ... UPDATE`. Any authenticated user could run
   `.update({ is_admin: true }).eq('id', <own id>)` and become an administrator.
2. `home_address` / `home_latitude` / `home_longitude` sat on the same table as a
   `USING (true)` search policy, so any account could read every user's
   residential address and exact coordinates.
3. `job_applications` — the job seeker's private hunt tracker — was reachable by
   employers through row-level policies plus `GRANT ALL`, exposing their private
   `notes` and letting an employer overwrite them.

Each is now closed by column-scoped grants, a table split, and a view + RPC
respectively. These tests assert both halves: the exploit is blocked **and** the
legitimate path still works. A test that only checks the block would pass just as
well if the feature were entirely broken.

## Running

Requires local Supabase (`./scripts/supabase-up.sh`) on the default API port.

```bash
bash tests/rls/authz-boundary.sh
```

Exits non-zero if any check fails. It creates its own throwaway users per run and
does not depend on seeded test accounts.

## Adding cases

The rule of thumb that produced these: for any table where one role's rows are
visible to another role, ask _which columns_ that implies — not whether the row
filter is right. If the answer is "all of them", the grant is the bug.
