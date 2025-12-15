/**
 * Unit Tests for useKeyboardShortcuts
 * Feature 052 - Test Coverage Expansion (T025)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, shortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('event listener management', () => {
    it('should register keydown listener on mount', () => {
      renderHook(() => useKeyboardShortcuts([]));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should remove keydown listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts([]));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });

  describe('shortcut matching', () => {
    it('should call callback when simple key matches', () => {
      const callback = vi.fn();

      renderHook(() => useKeyboardShortcuts([{ key: 'Escape', callback }]));

      // Get the keydown handler
      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      // Simulate Escape key
      keydownHandler(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(callback).toHaveBeenCalled();
    });

    it('should call callback when Ctrl+key matches', () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([{ key: 'k', ctrlOrCmd: true, callback }])
      );

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      // Simulate Ctrl+K
      keydownHandler(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

      expect(callback).toHaveBeenCalled();
    });

    it('should call callback when Cmd+key matches (metaKey)', () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([{ key: 'k', ctrlOrCmd: true, callback }])
      );

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      // Simulate Cmd+K (Mac)
      keydownHandler(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

      expect(callback).toHaveBeenCalled();
    });

    it('should not call callback when modifier does not match', () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([{ key: 'k', ctrlOrCmd: true, callback }])
      );

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      // Simulate just 'k' without Ctrl/Cmd
      keydownHandler(new KeyboardEvent('keydown', { key: 'k' }));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle Shift modifier', () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([{ key: 'a', shift: true, callback }])
      );

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      // Simulate Shift+A
      keydownHandler(
        new KeyboardEvent('keydown', { key: 'a', shiftKey: true })
      );

      expect(callback).toHaveBeenCalled();
    });

    it('should handle Alt modifier', () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([{ key: 'a', alt: true, callback }])
      );

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      // Simulate Alt+A
      keydownHandler(new KeyboardEvent('keydown', { key: 'a', altKey: true }));

      expect(callback).toHaveBeenCalled();
    });

    it('should handle multiple shortcuts', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          { key: 'a', callback: callback1 },
          { key: 'b', callback: callback2 },
        ])
      );

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'keydown'
      )?.[1] as (event: KeyboardEvent) => void;

      keydownHandler(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();

      keydownHandler(new KeyboardEvent('keydown', { key: 'b' }));
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('preset shortcuts', () => {
    it('should create openSearch shortcut', () => {
      const callback = vi.fn();
      const shortcut = shortcuts.openSearch(callback);

      expect(shortcut.key).toBe('k');
      expect(shortcut.ctrlOrCmd).toBe(true);
      expect(shortcut.description).toBe('Open search');
    });

    it('should create closeModal shortcut', () => {
      const callback = vi.fn();
      const shortcut = shortcuts.closeModal(callback);

      expect(shortcut.key).toBe('Escape');
      expect(shortcut.description).toBe('Close modal');
    });

    it('should create submitForm shortcut', () => {
      const callback = vi.fn();
      const shortcut = shortcuts.submitForm(callback);

      expect(shortcut.key).toBe('Enter');
      expect(shortcut.ctrlOrCmd).toBe(true);
      expect(shortcut.description).toBe('Submit form');
    });

    it('should create previousItem shortcut', () => {
      const callback = vi.fn();
      const shortcut = shortcuts.previousItem(callback);

      expect(shortcut.key).toBe('ArrowUp');
      expect(shortcut.description).toBe('Previous item');
    });

    it('should create nextItem shortcut', () => {
      const callback = vi.fn();
      const shortcut = shortcuts.nextItem(callback);

      expect(shortcut.key).toBe('ArrowDown');
      expect(shortcut.description).toBe('Next item');
    });

    it('should create jumpToItem shortcut', () => {
      const callback = vi.fn();
      const shortcut = shortcuts.jumpToItem(3, callback);

      expect(shortcut.key).toBe('3');
      expect(shortcut.ctrlOrCmd).toBe(true);
      expect(shortcut.description).toBe('Jump to item 3');
    });
  });
});
