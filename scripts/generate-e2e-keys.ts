#!/usr/bin/env npx tsx
/**
 * Generate pre-baked ECDH P-256 encryption keys for E2E test shard users.
 *
 * Produces a JSON blob containing keys for all 18 shard users (6 shards × 3 roles).
 * These keys are generated ONCE and stored as a GitHub secret (E2E_ENCRYPTION_KEYS).
 *
 * Each user gets:
 *   - DB row data: public_key (JWK) + encryption_salt (base64)
 *   - localStorage data: { privateKeyJwk, publicKeyJwk, salt }
 *
 * Keys are generated via WebCrypto (crypto.subtle) to ensure browser compatibility.
 * Node.js @noble/curves keys are NOT compatible with Firefox WebCrypto.
 *
 * Usage:
 *   npx tsx scripts/generate-e2e-keys.ts
 *   # or inside Docker:
 *   docker compose exec spoketowork npx tsx scripts/generate-e2e-keys.ts
 *
 * Output: JSON to stdout. Pipe to a file or copy to GitHub secrets.
 */

import { webcrypto } from 'crypto';

const subtle = webcrypto.subtle;

interface ShardUserKeys {
  email: string;
  db: {
    public_key: JsonWebKey;
    encryption_salt: string;
  };
  localStorage: {
    privateKeyJwk: JsonWebKey;
    publicKeyJwk: JsonWebKey;
    salt: string;
  };
}

async function generateKeysForUser(email: string): Promise<ShardUserKeys> {
  // Generate ECDH P-256 key pair via WebCrypto (browser-compatible)
  const keyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJwk = await subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await subtle.exportKey('jwk', keyPair.privateKey);

  // Generate a random salt (same format as key-service.ts generateSalt())
  const salt = new Uint8Array(16);
  webcrypto.getRandomValues(salt);
  const saltBase64 = Buffer.from(salt).toString('base64');

  // Public key for DB (strip private components)
  const dbPublicKey: JsonWebKey = {
    kty: publicKeyJwk.kty,
    crv: publicKeyJwk.crv,
    x: publicKeyJwk.x,
    y: publicKeyJwk.y,
  };

  return {
    email,
    db: {
      public_key: dbPublicKey,
      encryption_salt: saltBase64,
    },
    localStorage: {
      privateKeyJwk,
      publicKeyJwk: dbPublicKey,
      salt: saltBase64,
    },
  };
}

async function main() {
  const allKeys: Record<string, ShardUserKeys> = {};

  for (let shard = 1; shard <= 6; shard++) {
    for (const role of ['primary', 'secondary', 'tertiary']) {
      const email = `e2e-s${shard}-${role}@mailinator.com`;
      allKeys[email] = await generateKeysForUser(email);
    }
  }

  // Output as compact JSON (suitable for GitHub secret)
  console.log(JSON.stringify(allKeys));
}

main().catch((err) => {
  console.error('Failed to generate keys:', err);
  process.exit(1);
});
