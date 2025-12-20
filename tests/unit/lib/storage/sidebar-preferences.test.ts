import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clamp,
  getSidebarWidth,
  setSidebarWidth,
  SIDEBAR_DEFAULTS,
} from '@/lib/storage/sidebar-preferences';

describe('sidebar-preferences', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('clamp', () => {
    it('returns value when within bounds', () => {
      expect(clamp(250, 200, 400)).toBe(250);
    });

    it('returns min when value is below min', () => {
      expect(clamp(100, 200, 400)).toBe(200);
    });

    it('returns max when value is above max', () => {
      expect(clamp(500, 200, 400)).toBe(400);
    });

    it('handles edge case at min boundary', () => {
      expect(clamp(200, 200, 400)).toBe(200);
    });

    it('handles edge case at max boundary', () => {
      expect(clamp(400, 200, 400)).toBe(400);
    });

    it('handles negative values', () => {
      expect(clamp(-50, 200, 400)).toBe(200);
    });
  });

  describe('getSidebarWidth', () => {
    it('returns default width when no preference is stored', () => {
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.WIDTH);
    });

    it('returns stored width when valid preference exists', () => {
      localStorage.setItem(
        'spoketowork:sidebar-preferences',
        JSON.stringify({ width: 350 })
      );
      expect(getSidebarWidth()).toBe(350);
    });

    it('clamps stored width to minimum', () => {
      localStorage.setItem(
        'spoketowork:sidebar-preferences',
        JSON.stringify({ width: 100 })
      );
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.MIN_WIDTH);
    });

    it('clamps stored width to maximum', () => {
      localStorage.setItem(
        'spoketowork:sidebar-preferences',
        JSON.stringify({ width: 500 })
      );
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.MAX_WIDTH);
    });

    it('returns default when stored value is invalid JSON', () => {
      localStorage.setItem('spoketowork:sidebar-preferences', 'not-json');
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.WIDTH);
    });

    it('returns default when width is not a number', () => {
      localStorage.setItem(
        'spoketowork:sidebar-preferences',
        JSON.stringify({ width: 'wide' })
      );
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.WIDTH);
    });

    it('returns default when width is NaN', () => {
      localStorage.setItem(
        'spoketowork:sidebar-preferences',
        JSON.stringify({ width: NaN })
      );
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.WIDTH);
    });

    it('returns default when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });
      expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULTS.WIDTH);
    });
  });

  describe('setSidebarWidth', () => {
    it('saves valid width to localStorage', () => {
      setSidebarWidth(300);
      const stored = JSON.parse(
        localStorage.getItem('spoketowork:sidebar-preferences') || '{}'
      );
      expect(stored.width).toBe(300);
    });

    it('clamps width to minimum before saving', () => {
      setSidebarWidth(100);
      const stored = JSON.parse(
        localStorage.getItem('spoketowork:sidebar-preferences') || '{}'
      );
      expect(stored.width).toBe(SIDEBAR_DEFAULTS.MIN_WIDTH);
    });

    it('clamps width to maximum before saving', () => {
      setSidebarWidth(600);
      const stored = JSON.parse(
        localStorage.getItem('spoketowork:sidebar-preferences') || '{}'
      );
      expect(stored.width).toBe(SIDEBAR_DEFAULTS.MAX_WIDTH);
    });

    it('saves exactly at minimum boundary', () => {
      setSidebarWidth(200);
      const stored = JSON.parse(
        localStorage.getItem('spoketowork:sidebar-preferences') || '{}'
      );
      expect(stored.width).toBe(200);
    });

    it('saves exactly at maximum boundary', () => {
      setSidebarWidth(400);
      const stored = JSON.parse(
        localStorage.getItem('spoketowork:sidebar-preferences') || '{}'
      );
      expect(stored.width).toBe(400);
    });

    it('silently fails when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });
      // Should not throw
      expect(() => setSidebarWidth(300)).not.toThrow();
    });
  });

  describe('SIDEBAR_DEFAULTS', () => {
    it('has correct default width', () => {
      expect(SIDEBAR_DEFAULTS.WIDTH).toBe(280);
    });

    it('has correct min width', () => {
      expect(SIDEBAR_DEFAULTS.MIN_WIDTH).toBe(200);
    });

    it('has correct max width', () => {
      expect(SIDEBAR_DEFAULTS.MAX_WIDTH).toBe(400);
    });

    it('has correct storage key', () => {
      expect(SIDEBAR_DEFAULTS.STORAGE_KEY).toBe(
        'spoketowork:sidebar-preferences'
      );
    });
  });

  describe('integration', () => {
    it('round-trips width correctly', () => {
      setSidebarWidth(325);
      expect(getSidebarWidth()).toBe(325);
    });

    it('handles multiple set/get cycles', () => {
      setSidebarWidth(250);
      expect(getSidebarWidth()).toBe(250);
      setSidebarWidth(375);
      expect(getSidebarWidth()).toBe(375);
      setSidebarWidth(200);
      expect(getSidebarWidth()).toBe(200);
    });
  });
});
