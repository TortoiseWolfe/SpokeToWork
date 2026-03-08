import { describe, it, expect } from 'vitest';
import {
  EMAIL_REGEX,
  UUID_REGEX,
  isValidEmail,
  isValidUUID,
} from '../patterns';

describe('validation patterns', () => {
  describe('EMAIL_REGEX', () => {
    it('should match valid emails', () => {
      expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('test.user@domain.org')).toBe(true);
      expect(EMAIL_REGEX.test('user+tag@gmail.com')).toBe(true);
    });

    it('should not match invalid emails', () => {
      expect(EMAIL_REGEX.test('invalid')).toBe(false);
      expect(EMAIL_REGEX.test('@domain.com')).toBe(false);
      expect(EMAIL_REGEX.test('user@')).toBe(false);
      expect(EMAIL_REGEX.test('user@domain')).toBe(false);
    });
  });

  describe('UUID_REGEX', () => {
    it('should match valid UUIDs', () => {
      expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(
        true
      );
      expect(UUID_REGEX.test('00000000-0000-0000-0000-000000000000')).toBe(
        true
      );
      expect(UUID_REGEX.test('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF')).toBe(
        true
      );
    });

    it('should not match invalid UUIDs', () => {
      expect(UUID_REGEX.test('not-a-uuid')).toBe(false);
      expect(UUID_REGEX.test('550e8400-e29b-41d4-a716')).toBe(false);
      expect(UUID_REGEX.test('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test@domain.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(isValidEmail('  user@example.com  ')).toBe(true);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('invalid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
  });
});
