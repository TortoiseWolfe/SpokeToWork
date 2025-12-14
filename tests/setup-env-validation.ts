/**
 * Pre-flight environment validation for test suite
 *
 * This module validates that all required test credentials are configured
 * before any tests run. It fails fast with clear error messages listing
 * ALL missing variables, not just the first one found.
 *
 * @see docs/specs/047-test-security/spec.md FR-002
 */

const REQUIRED_ENV_VARS = [
  'TEST_USER_PRIMARY_EMAIL',
  'TEST_USER_PRIMARY_PASSWORD',
  'TEST_USER_TERTIARY_EMAIL',
  'TEST_USER_TERTIARY_PASSWORD',
] as const;

// Optional env vars - documented but not required for basic tests
const OPTIONAL_ENV_VARS = [
  'TEST_USER_SECONDARY_EMAIL',
  'TEST_USER_SECONDARY_PASSWORD',
  'TEST_USER_ADMIN_EMAIL',
] as const;

/**
 * Validate that all required test environment variables are set
 * @throws Error if any required variables are missing or empty
 */
export function validateTestEnvironment(): void {
  const missingVars: string[] = [];
  const emptyVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (value === undefined) {
      missingVars.push(varName);
    } else if (value.trim() === '') {
      emptyVars.push(varName);
    }
  }

  if (missingVars.length > 0 || emptyVars.length > 0) {
    const errorParts: string[] = [
      '\n========================================',
      'TEST ENVIRONMENT CONFIGURATION ERROR',
      '========================================\n',
    ];

    if (missingVars.length > 0) {
      errorParts.push('Missing required environment variables:');
      missingVars.forEach((v) => errorParts.push(`  - ${v}`));
      errorParts.push('');
    }

    if (emptyVars.length > 0) {
      errorParts.push('Empty environment variables (must have value):');
      emptyVars.forEach((v) => errorParts.push(`  - ${v}`));
      errorParts.push('');
    }

    errorParts.push(
      'To configure test environment:',
      '1. Copy .env.example to .env',
      '2. Fill in the TEST_USER_* variables with valid credentials',
      '3. See CLAUDE.md: Test Users section for details',
      '',
      'Required variables:',
      ...REQUIRED_ENV_VARS.map((v) => `  - ${v}`),
      '',
      'Optional variables (for specific test types):',
      ...OPTIONAL_ENV_VARS.map((v) => `  - ${v}`),
      '========================================'
    );

    throw new Error(errorParts.join('\n'));
  }
}

// Run validation immediately when this module is imported
// This ensures tests fail fast before any test code executes
validateTestEnvironment();
