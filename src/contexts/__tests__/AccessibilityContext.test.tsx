/**
 * Unit Tests for AccessibilityContext.tsx
 * Feature 052 - Test Coverage Expansion
 *
 * Tests accessibility settings management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  AccessibilityProvider,
  useAccessibility,
} from '../AccessibilityContext';

// Mock consent utils
vi.mock('@/utils/consent', () => ({
  canUseCookies: vi.fn(() => true),
}));

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key]
    );
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AccessibilityContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset document styles
    document.documentElement.style.cssText = '';
    document.documentElement.removeAttribute('data-high-contrast');
    document.documentElement.removeAttribute('data-reduce-motion');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AccessibilityProvider', () => {
    it('should render children', () => {
      render(
        <AccessibilityProvider>
          <div data-testid="child">Child Content</div>
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide default settings', () => {
      const TestComponent = () => {
        const { settings } = useAccessibility();
        return <div data-testid="settings">{JSON.stringify(settings)}</div>;
      };

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      const settings = JSON.parse(
        screen.getByTestId('settings').textContent || '{}'
      );
      expect(settings.fontSize).toBe('medium');
      expect(settings.lineHeight).toBe('normal');
      expect(settings.fontFamily).toBe('sans-serif');
      expect(settings.highContrast).toBe('normal');
      expect(settings.reduceMotion).toBe('no-preference');
    });
  });

  describe('useAccessibility hook', () => {
    it('should throw when used outside provider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAccessibility());
      }).toThrow('useAccessibility must be used within AccessibilityProvider');

      consoleSpy.mockRestore();
    });

    it('should return settings and functions', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      expect(result.current.settings).toBeDefined();
      expect(result.current.updateSettings).toBeDefined();
      expect(result.current.resetSettings).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update fontSize', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ fontSize: 'large' });
      });

      expect(result.current.settings.fontSize).toBe('large');
    });

    it('should update lineHeight', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ lineHeight: 'relaxed' });
      });

      expect(result.current.settings.lineHeight).toBe('relaxed');
    });

    it('should update fontFamily', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ fontFamily: 'mono' });
      });

      expect(result.current.settings.fontFamily).toBe('mono');
    });

    it('should update highContrast', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ highContrast: 'high' });
      });

      expect(result.current.settings.highContrast).toBe('high');
    });

    it('should update reduceMotion', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ reduceMotion: 'reduce' });
      });

      expect(result.current.settings.reduceMotion).toBe('reduce');
    });

    it('should apply CSS variables to document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ fontSize: 'x-large' });
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--font-scale-factor')).toBe('2.125');
    });

    it('should set high contrast attribute on document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ highContrast: 'high' });
      });

      expect(document.documentElement.getAttribute('data-high-contrast')).toBe(
        'true'
      );
    });

    it('should set reduce motion attribute on document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ reduceMotion: 'reduce' });
      });

      expect(document.documentElement.getAttribute('data-reduce-motion')).toBe(
        'true'
      );
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      // Change some settings
      act(() => {
        result.current.updateSettings({
          fontSize: 'x-large',
          highContrast: 'high',
        });
      });

      expect(result.current.settings.fontSize).toBe('x-large');

      // Reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings.fontSize).toBe('medium');
      expect(result.current.settings.highContrast).toBe('normal');
    });
  });

  describe('persistence', () => {
    it('should save settings to localStorage when cookies allowed', async () => {
      const { canUseCookies } = await import('@/utils/consent');
      (canUseCookies as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      act(() => {
        result.current.updateSettings({ fontSize: 'large' });
      });

      // Check localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
