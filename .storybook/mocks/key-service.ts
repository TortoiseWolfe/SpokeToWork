/**
 * Mock key management service for Storybook
 *
 * Replaces @/services/messaging/key-service so ReAuthModal doesn't
 * try to dynamically import the real service (which pulls in Argon2/WASM,
 * Supabase, etc.) and redirect away on failure.
 */

export class KeyManagementService {
  async hasKeys() {
    // Pretend keys exist so ReAuthModal shows the unlock form
    return true;
  }

  async deriveKeys(_password: string) {
    return {
      privateKey: {} as CryptoKey,
      publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'mock', y: 'mock' },
    };
  }

  async needsMigration() {
    return false;
  }

  async initializeKeys(_password: string) {
    return {
      privateKey: {} as CryptoKey,
      publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'mock', y: 'mock' },
    };
  }

  getKeys() {
    return null;
  }

  clearKeys() {}
}

export const keyManagementService = new KeyManagementService();
