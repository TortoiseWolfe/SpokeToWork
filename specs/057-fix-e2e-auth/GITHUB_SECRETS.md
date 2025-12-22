# GitHub Secrets Configuration for E2E Tests

## Required Secrets

Update these secrets in GitHub repository settings:
`Settings > Secrets and variables > Actions > Repository secrets`

### Test User Credentials

| Secret Name                   | Value                     |
| ----------------------------- | ------------------------- |
| `TEST_USER_PRIMARY_EMAIL`     | `jonpohlner@gmail.com`    |
| `TEST_USER_PRIMARY_PASSWORD`  | (same as local .env)      |
| `TEST_USER_TERTIARY_EMAIL`    | `test-user-c@example.com` |
| `TEST_USER_TERTIARY_PASSWORD` | (same as local .env)      |

**IMPORTANT**: Email must be **lowercase** to match Supabase auth.users table.

### Supabase Configuration

| Secret Name                     | Value                                      |
| ------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://utxdunkaropkwnrqrsef.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from local .env)                          |
| `SUPABASE_ACCESS_TOKEN`         | (from local .env)                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | (from local .env)                          |

## Verification

After updating secrets, trigger the E2E workflow:

```bash
gh workflow run e2e.yml
```

Or push to the repository to trigger automatically.

## Troubleshooting

If tests still fail after updating secrets:

1. Verify email is lowercase in the secret
2. Check password matches what's in Supabase
3. Verify test user exists: Query `auth.users` table
4. Check for rate limiting on test user
