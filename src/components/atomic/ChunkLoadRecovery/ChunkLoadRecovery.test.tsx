import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import ChunkLoadRecovery from './ChunkLoadRecovery';
import {
  STABLE_MS,
  isChunkLoadError,
  handleChunkLoadError,
  hasRecoveryBeenAttempted,
} from '@/lib/chunk-load-recovery';

function chunkError(): Error {
  const error = new Error('Loading chunk 123 failed.');
  error.name = 'ChunkLoadError';
  return error;
}

describe('chunk-load-recovery', () => {
  const reload = vi.fn();
  const realLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, reload },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });

  describe('isChunkLoadError', () => {
    it('recognises ChunkLoadError by name', () => {
      const error = new Error('anything');
      error.name = 'ChunkLoadError';
      expect(isChunkLoadError(error)).toBe(true);
    });

    it.each([
      'Loading chunk 123 failed.',
      'Loading CSS chunk 456 failed.',
      'Failed to fetch dynamically imported module: /_next/static/chunks/a.js',
    ])('recognises the message "%s"', (message) => {
      expect(isChunkLoadError(new Error(message))).toBe(true);
    });

    it('rejects unrelated errors and non-errors', () => {
      expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
      expect(isChunkLoadError('Loading chunk 1 failed')).toBe(false);
    });
  });

  describe('handleChunkLoadError', () => {
    it('reloads once and sets the flag', () => {
      expect(handleChunkLoadError(chunkError())).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(hasRecoveryBeenAttempted()).toBe(true);
    });

    it('does not reload a second time in the same session', () => {
      handleChunkLoadError(chunkError());
      expect(handleChunkLoadError(chunkError())).toBe(false);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does nothing for an unrelated error', () => {
      expect(handleChunkLoadError(new Error('boom'))).toBe(false);
      expect(reload).not.toHaveBeenCalled();
      expect(hasRecoveryBeenAttempted()).toBe(false);
    });
  });

  describe('<ChunkLoadRecovery />', () => {
    it('renders nothing', () => {
      const { container } = render(<ChunkLoadRecovery />);
      expect(container).toBeEmptyDOMElement();
    });

    it('reloads once on a window error event, not on the second', () => {
      render(<ChunkLoadRecovery />);
      window.dispatchEvent(new ErrorEvent('error', { error: chunkError() }));
      window.dispatchEvent(new ErrorEvent('error', { error: chunkError() }));
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('reloads once on an unhandled rejection', () => {
      render(<ChunkLoadRecovery />);
      const event = new Event('unhandledrejection') as PromiseRejectionEvent;
      Object.defineProperty(event, 'reason', { value: chunkError() });
      window.dispatchEvent(event);
      window.dispatchEvent(event);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('ignores unrelated errors', () => {
      render(<ChunkLoadRecovery />);
      window.dispatchEvent(
        new ErrorEvent('error', { error: new Error('boom') })
      );
      expect(reload).not.toHaveBeenCalled();
    });

    it('keeps the flag across an immediate re-mount, clears it once stable', () => {
      sessionStorage.setItem('stw-chunk-recovery-attempted', 'true');
      render(<ChunkLoadRecovery />);
      expect(hasRecoveryBeenAttempted()).toBe(true);
      vi.advanceTimersByTime(STABLE_MS);
      expect(hasRecoveryBeenAttempted()).toBe(false);
    });

    it('stops listening after unmount', () => {
      const { unmount } = render(<ChunkLoadRecovery />);
      unmount();
      window.dispatchEvent(new ErrorEvent('error', { error: chunkError() }));
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
