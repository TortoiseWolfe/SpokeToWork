/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkPasswordBreach, formatBreachWarning } from './password-breach';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('password-breach', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkPasswordBreach', () => {
    it('should return not breached for empty password', async () => {
      const result = await checkPasswordBreach('');
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should return breached when password hash found in response', async () => {
      // SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\n' +
          '1E4D6D08F4C9F3F0682250B6CF8331B7EE68FD9:123\n' +
          '1E4E6E09F5C0F4F0682250B6CF8331B7EE68FDA:456',
      });

      const result = await checkPasswordBreach('password');
      expect(result.breached).toBe(true);
      expect(result.count).toBe(3861493);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pwnedpasswords.com/range/5BAA6',
        expect.objectContaining({
          headers: { 'Add-Padding': 'true' },
        })
      );
    });

    it('should return not breached when hash not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          'AAAAA1111111111111111111111111111111:100\n' +
          'BBBBB2222222222222222222222222222222:200',
      });

      const result = await checkPasswordBreach('unique-strong-password-xyz!');
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should handle rate limiting gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await checkPasswordBreach('testpassword');
      expect(result.breached).toBe(false);
      expect(result.error).toBe('Rate limited');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await checkPasswordBreach('testpassword');
      expect(result.breached).toBe(false);
      expect(result.error).toContain('HIBP API error');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkPasswordBreach('testpassword');
      expect(result.breached).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('formatBreachWarning', () => {
    it('should return empty string for count 0', () => {
      expect(formatBreachWarning(0)).toBe('');
    });

    it('should handle singular breach', () => {
      const warning = formatBreachWarning(1);
      expect(warning).toContain('appeared in a data breach');
      expect(warning).toContain('Consider using a different password');
    });

    it('should handle small breach counts', () => {
      const warning = formatBreachWarning(50);
      expect(warning).toContain('50 data breaches');
      expect(warning).toContain('Consider using a different password');
    });

    it('should handle medium breach counts with formatting', () => {
      const warning = formatBreachWarning(5000);
      expect(warning).toContain('5,000');
      expect(warning).toContain('Please choose a stronger password');
    });

    it('should handle large breach counts with urgent message', () => {
      const warning = formatBreachWarning(1000000);
      expect(warning).toContain('1,000,000');
      expect(warning).toContain('Please choose a different password');
    });
  });
});
