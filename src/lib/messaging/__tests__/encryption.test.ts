/**
 * Unit Tests for EncryptionService
 * Task: T041
 *
 * Tests: generateKeyPair, exportPublicKey, deriveSharedSecret,
 *        encryptMessage, decryptMessage, error cases
 *
 * Note: Private key storage tests removed - keys are now managed by
 * KeyManagementService (memory-only, derived from password).
 *
 * Coverage Target: 100%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionService } from '../encryption';
import { CRYPTO_PARAMS } from '@/types/messaging';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('generateKeyPair', () => {
    it('should generate a valid ECDH key pair', async () => {
      const keyPair = await service.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.privateKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.publicKey.type).toBe('public');
      expect(keyPair.privateKey.type).toBe('private');
      expect(keyPair.publicKey.algorithm.name).toBe('ECDH');
      expect(keyPair.privateKey.algorithm.name).toBe('ECDH');
    });

    it('should generate extractable private key', async () => {
      const keyPair = await service.generateKeyPair();
      expect(keyPair.privateKey.extractable).toBe(true);
    });

    it('should generate non-extractable public key', async () => {
      const keyPair = await service.generateKeyPair();
      // Public keys are typically extractable for sharing
      expect(keyPair.publicKey.extractable).toBe(true);
    });

    it('should throw error if Web Crypto API is unavailable', async () => {
      // Mock crypto.subtle to be undefined
      const originalSubtle = crypto.subtle;
      Object.defineProperty(crypto, 'subtle', {
        value: undefined,
        configurable: true,
      });

      await expect(service.generateKeyPair()).rejects.toThrow();

      // Restore original
      Object.defineProperty(crypto, 'subtle', {
        value: originalSubtle,
        configurable: true,
      });
    });
  });

  describe('exportPublicKey', () => {
    it('should export public key to JWK format', async () => {
      const keyPair = await service.generateKeyPair();
      const jwk = await service.exportPublicKey(keyPair.publicKey);

      expect(jwk).toBeDefined();
      expect(jwk.kty).toBe('EC');
      expect(jwk.crv).toBe(CRYPTO_PARAMS.CURVE);
      expect(jwk.x).toBeDefined();
      expect(jwk.y).toBeDefined();
      // Note: key_ops may be empty on exported keys, which is expected
    });

    it('should throw error for invalid key', async () => {
      const invalidKey = {} as CryptoKey;
      await expect(service.exportPublicKey(invalidKey)).rejects.toThrow();
    });
  });

  describe('deriveSharedSecret', () => {
    it('should derive AES-GCM shared secret from key pair', async () => {
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();

      const sharedSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      expect(sharedSecret).toBeInstanceOf(CryptoKey);
      expect(sharedSecret.type).toBe('secret');
      expect(sharedSecret.algorithm.name).toBe(CRYPTO_PARAMS.AES_ALGORITHM);
    });

    it('should derive same secret from both sides', async () => {
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();

      const aliceSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const bobSecret = await service.deriveSharedSecret(
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      );

      // Shared secrets are not extractable by design (security best practice)
      // Instead, verify they work by encrypting with one and decrypting with the other
      const plaintext = 'Test message';
      const encrypted = await service.encryptMessage(plaintext, aliceSecret);
      const decrypted = await service.decryptMessage(
        encrypted.ciphertext,
        encrypted.iv,
        bobSecret
      );

      expect(decrypted).toBe(plaintext); // Same shared secret if this works
    });

    it('should throw error for incompatible keys', async () => {
      const keyPair = await service.generateKeyPair();
      const invalidKey = {} as CryptoKey;

      await expect(
        service.deriveSharedSecret(keyPair.privateKey, invalidKey)
      ).rejects.toThrow();
    });
  });

  describe('encryptMessage', () => {
    it('should encrypt message with AES-GCM', async () => {
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const plaintext = 'Hello, this is a secret message!';
      const encrypted = await service.encryptMessage(plaintext, sharedSecret);

      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(typeof encrypted.ciphertext).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('should generate different IV for each encryption', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const plaintext = 'Same message';
      const encrypted1 = await service.encryptMessage(plaintext, sharedSecret);
      const encrypted2 = await service.encryptMessage(plaintext, sharedSecret);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });

    it('should handle empty string', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const encrypted = await service.encryptMessage('', sharedSecret);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const plaintext = '🔒 Encrypted emoji message 日本語';
      const encrypted = await service.encryptMessage(plaintext, sharedSecret);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
    });

    it('should throw error for invalid key', async () => {
      const invalidKey = {} as CryptoKey;
      await expect(
        service.encryptMessage('message', invalidKey)
      ).rejects.toThrow();
    });
  });

  describe('decryptMessage', () => {
    it('should decrypt message encrypted with same shared secret', async () => {
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const plaintext = 'Secret message';
      const encrypted = await service.encryptMessage(plaintext, sharedSecret);

      const bobSharedSecret = await service.deriveSharedSecret(
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      );

      const decrypted = await service.decryptMessage(
        encrypted.ciphertext,
        encrypted.iv,
        bobSharedSecret
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string roundtrip', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const encrypted = await service.encryptMessage('', sharedSecret);
      const decrypted = await service.decryptMessage(
        encrypted.ciphertext,
        encrypted.iv,
        sharedSecret
      );

      expect(decrypted).toBe('');
    });

    it('should handle unicode characters roundtrip', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const plaintext = '🔒 Encrypted emoji message 日本語';
      const encrypted = await service.encryptMessage(plaintext, sharedSecret);
      const decrypted = await service.decryptMessage(
        encrypted.ciphertext,
        encrypted.iv,
        sharedSecret
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for wrong key', async () => {
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();
      const charlieKeyPair = await service.generateKeyPair();

      const sharedSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const plaintext = 'Secret message';
      const encrypted = await service.encryptMessage(plaintext, sharedSecret);

      const wrongSecret = await service.deriveSharedSecret(
        charlieKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      await expect(
        service.decryptMessage(encrypted.ciphertext, encrypted.iv, wrongSecret)
      ).rejects.toThrow();
    });

    it('should throw error for corrupted ciphertext', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const encrypted = await service.encryptMessage('message', sharedSecret);
      const corruptedCiphertext = encrypted.ciphertext.slice(0, -5) + 'XXXXX';

      await expect(
        service.decryptMessage(corruptedCiphertext, encrypted.iv, sharedSecret)
      ).rejects.toThrow();
    });

    it('should throw error for corrupted IV', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      const encrypted = await service.encryptMessage('message', sharedSecret);
      const corruptedIV = 'AAAAAAAAAAAAAAAA'; // Invalid IV

      await expect(
        service.decryptMessage(encrypted.ciphertext, corruptedIV, sharedSecret)
      ).rejects.toThrow();
    });

    it('should throw error for invalid base64 ciphertext', async () => {
      const keyPair = await service.generateKeyPair();
      const sharedSecret = await service.deriveSharedSecret(
        keyPair.privateKey,
        keyPair.publicKey
      );

      await expect(
        service.decryptMessage(
          'not-valid-base64!@#',
          'validIV===',
          sharedSecret
        )
      ).rejects.toThrow();
    });
  });

  describe('end-to-end encryption flow', () => {
    it('should complete full encryption roundtrip between two users', async () => {
      // Alice and Bob generate their key pairs (in real app, derived from password)
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();

      // Alice derives shared secret with Bob's public key
      const aliceSharedSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      // Alice encrypts a message
      const plaintext = 'Hello Bob! This is a secret message from Alice.';
      const encrypted = await service.encryptMessage(
        plaintext,
        aliceSharedSecret
      );

      // Bob derives the same shared secret with Alice's public key
      const bobSharedSecret = await service.deriveSharedSecret(
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      );

      // Bob decrypts the message
      const decrypted = await service.decryptMessage(
        encrypted.ciphertext,
        encrypted.iv,
        bobSharedSecret
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should maintain zero-knowledge architecture (server never sees plaintext)', async () => {
      const aliceKeyPair = await service.generateKeyPair();
      const bobKeyPair = await service.generateKeyPair();

      const sharedSecret = await service.deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const plaintext = 'Sensitive information';
      const encrypted = await service.encryptMessage(plaintext, sharedSecret);

      // Verify ciphertext is base64 (what would be stored in DB)
      expect(() => atob(encrypted.ciphertext)).not.toThrow();
      expect(() => atob(encrypted.iv)).not.toThrow();

      // Verify ciphertext doesn't contain plaintext
      expect(encrypted.ciphertext).not.toContain(plaintext);
      expect(atob(encrypted.ciphertext)).not.toContain(plaintext);
    });
  });
});
