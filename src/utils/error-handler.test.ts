/**
 * Tests for error-handler.ts
 * Covers AppError class, ErrorHandler class, and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mockLogger is available when vi.mock is hoisted
const { mockLogger, mockTrackError } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockTrackError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

vi.mock('@/utils/analytics', () => ({
  trackError: mockTrackError,
}));

// Import after mocks are set up
import {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  handleNetworkError,
  handleValidationError,
  handleAuthError,
  handleCriticalError,
} from './error-handler';
import errorHandler from './error-handler';

describe('error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler.clearQueue();
    // Reset config to defaults
    errorHandler.updateConfig({
      logToConsole: true,
      logToService: true,
      showUserNotification: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // AppError Class Tests
  // =========================================================================

  describe('AppError', () => {
    it('creates error with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.context).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });

    it('creates error with custom severity and category', () => {
      const error = new AppError('Critical error', {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
      });

      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
    });

    it('creates error with context', () => {
      const context = { userId: '123', action: 'login' };
      const error = new AppError('Auth error', { context });

      expect(error.context).toEqual(context);
    });

    it('creates error with original error', () => {
      const originalError = new Error('Original');
      const error = new AppError('Wrapped error', { originalError });

      expect(error.originalError).toBe(originalError);
    });

    it('captures stack trace', () => {
      const error = new AppError('Stack test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });

    it('extends Error properly', () => {
      const error = new AppError('Instance test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  // =========================================================================
  // ErrorHandler.handle() Tests
  // =========================================================================

  describe('ErrorHandler.handle()', () => {
    it('handles AppError directly', () => {
      const appError = new AppError('Direct error', {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.NETWORK,
      });

      errorHandler.handle(appError);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockTrackError).toHaveBeenCalled();
    });

    it('handles standard Error', () => {
      const error = new Error('Standard error');

      errorHandler.handle(error);

      expect(mockLogger.warn).toHaveBeenCalled(); // MEDIUM severity = warn
    });

    it('handles unknown error type (string)', () => {
      errorHandler.handle('String error');

      expect(mockLogger.error).toHaveBeenCalled(); // HIGH severity for unknown
    });

    it('handles unknown error type (object)', () => {
      errorHandler.handle({ code: 500, message: 'Object error' });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles null/undefined', () => {
      errorHandler.handle(null);
      errorHandler.handle(undefined);

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('merges context with existing AppError context', () => {
      const appError = new AppError('Error with context', {
        context: { original: 'value' },
      });

      errorHandler.handle(appError, { additional: 'context' });

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].context).toEqual({
        original: 'value',
        additional: 'context',
      });
    });

    it('adds context to standard Error', () => {
      const error = new Error('Error');

      errorHandler.handle(error, { userId: '123' });

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].context).toEqual({ userId: '123' });
    });
  });

  // =========================================================================
  // ErrorHandler.handleAsync() Tests
  // =========================================================================

  describe('ErrorHandler.handleAsync()', () => {
    it('returns value on successful promise', async () => {
      const result = await errorHandler.handleAsync(Promise.resolve('success'));

      expect(result).toBe('success');
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('returns null on rejected promise', async () => {
      const result = await errorHandler.handleAsync(
        Promise.reject(new Error('Failed'))
      );

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('handles rejected promise with context', async () => {
      await errorHandler.handleAsync(Promise.reject(new Error('Failed')), {
        operation: 'test',
      });

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].context).toEqual({ operation: 'test' });
    });
  });

  // =========================================================================
  // Error Categorization Tests
  // =========================================================================

  describe('Error categorization', () => {
    it('categorizes network errors', () => {
      errorHandler.handle(new Error('Network request failed'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.NETWORK);
    });

    it('categorizes fetch errors', () => {
      errorHandler.handle(new Error('fetch error occurred'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.NETWORK);
    });

    it('categorizes validation errors', () => {
      errorHandler.handle(new Error('Validation failed'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.VALIDATION);
    });

    it('categorizes invalid input errors', () => {
      errorHandler.handle(new Error('Invalid email format'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.VALIDATION);
    });

    it('categorizes 401 authentication errors', () => {
      errorHandler.handle(new Error('401 Unauthorized'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('categorizes unauthorized errors', () => {
      errorHandler.handle(new Error('User is unauthorized'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('categorizes 403 authorization errors', () => {
      errorHandler.handle(new Error('403 Forbidden'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.AUTHORIZATION);
    });

    it('categorizes forbidden errors', () => {
      errorHandler.handle(new Error('Access forbidden'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.AUTHORIZATION);
    });

    it('defaults to unknown category', () => {
      errorHandler.handle(new Error('Some random error'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.UNKNOWN);
    });

    it('handles case-insensitive matching', () => {
      errorHandler.handle(new Error('NETWORK ERROR'));

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors[0].category).toBe(ErrorCategory.NETWORK);
    });
  });

  // =========================================================================
  // Severity-based Logging Tests
  // =========================================================================

  describe('Severity-based logging', () => {
    it('logs CRITICAL errors with error level', () => {
      // Disable notifications to isolate logging test
      errorHandler.updateConfig({ showUserNotification: false });
      const error = new AppError('Critical', {
        severity: ErrorSeverity.CRITICAL,
      });

      errorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('logs HIGH errors with error level', () => {
      // Disable notifications to isolate logging test
      errorHandler.updateConfig({ showUserNotification: false });
      const error = new AppError('High', { severity: ErrorSeverity.HIGH });

      errorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs MEDIUM errors with warn level', () => {
      const error = new AppError('Medium', { severity: ErrorSeverity.MEDIUM });

      errorHandler.handle(error);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('logs LOW errors with info level', () => {
      const error = new AppError('Low', { severity: ErrorSeverity.LOW });

      errorHandler.handle(error);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('respects logToConsole config', () => {
      errorHandler.updateConfig({ logToConsole: false });

      errorHandler.handle(new AppError('Silenced'));

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Analytics Tracking Tests
  // =========================================================================

  describe('Analytics tracking', () => {
    it('tracks errors to analytics', () => {
      errorHandler.handle(new AppError('Tracked error'));

      expect(mockTrackError).toHaveBeenCalled();
    });

    it('marks CRITICAL errors as fatal', () => {
      errorHandler.handle(
        new AppError('Fatal', { severity: ErrorSeverity.CRITICAL })
      );

      expect(mockTrackError).toHaveBeenCalledWith(
        expect.stringContaining('Fatal'),
        true
      );
    });

    it('marks HIGH errors as fatal', () => {
      errorHandler.handle(
        new AppError('High severity', { severity: ErrorSeverity.HIGH })
      );

      expect(mockTrackError).toHaveBeenCalledWith(expect.any(String), true);
    });

    it('marks MEDIUM errors as non-fatal', () => {
      errorHandler.handle(
        new AppError('Medium', { severity: ErrorSeverity.MEDIUM })
      );

      expect(mockTrackError).toHaveBeenCalledWith(expect.any(String), false);
    });

    it('marks LOW errors as non-fatal', () => {
      errorHandler.handle(new AppError('Low', { severity: ErrorSeverity.LOW }));

      expect(mockTrackError).toHaveBeenCalledWith(expect.any(String), false);
    });

    it('includes category in error message', () => {
      errorHandler.handle(
        new AppError('Network failed', { category: ErrorCategory.NETWORK })
      );

      expect(mockTrackError).toHaveBeenCalledWith(
        '[network] Network failed',
        expect.any(Boolean)
      );
    });

    it('respects logToService config', () => {
      errorHandler.updateConfig({ logToService: false });

      errorHandler.handle(new AppError('Not tracked'));

      expect(mockTrackError).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // User Notification Tests
  // =========================================================================

  describe('User notifications', () => {
    let capturedEvents: CustomEvent[] = [];
    let originalDispatch: typeof window.dispatchEvent;

    beforeEach(() => {
      capturedEvents = [];
      originalDispatch = window.dispatchEvent.bind(window);
      window.dispatchEvent = (event: Event) => {
        if (event instanceof CustomEvent && event.type === 'app:error') {
          capturedEvents.push(event);
        }
        return originalDispatch(event);
      };
    });

    afterEach(() => {
      window.dispatchEvent = originalDispatch;
    });

    it('notifies user for HIGH severity errors', () => {
      errorHandler.handle(
        new AppError('High error', { severity: ErrorSeverity.HIGH })
      );

      // Notification dispatches custom event
      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].detail.severity).toBe('high');
    });

    it('notifies user for CRITICAL severity errors', () => {
      errorHandler.handle(
        new AppError('Critical', { severity: ErrorSeverity.CRITICAL })
      );

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].detail.severity).toBe('critical');
    });

    it('does not notify for MEDIUM severity errors', () => {
      errorHandler.handle(
        new AppError('Medium', { severity: ErrorSeverity.MEDIUM })
      );

      expect(capturedEvents.length).toBe(0);
    });

    it('does not notify for LOW severity errors', () => {
      errorHandler.handle(new AppError('Low', { severity: ErrorSeverity.LOW }));

      expect(capturedEvents.length).toBe(0);
    });

    it('respects showUserNotification config', () => {
      errorHandler.updateConfig({ showUserNotification: false });

      errorHandler.handle(
        new AppError('High', { severity: ErrorSeverity.HIGH })
      );

      // No custom event should be dispatched when notifications are disabled
      expect(capturedEvents.length).toBe(0);
    });
  });

  // =========================================================================
  // Queue Management Tests
  // =========================================================================

  describe('Queue management', () => {
    it('adds errors to queue', () => {
      errorHandler.handle(new AppError('Error 1'));
      errorHandler.handle(new AppError('Error 2'));

      const recent = errorHandler.getRecentErrors(10);
      expect(recent).toHaveLength(2);
    });

    it('getRecentErrors returns requested count', () => {
      for (let i = 0; i < 5; i++) {
        errorHandler.handle(new AppError(`Error ${i}`));
      }

      expect(errorHandler.getRecentErrors(3)).toHaveLength(3);
      expect(errorHandler.getRecentErrors(10)).toHaveLength(5);
    });

    it('getRecentErrors returns most recent errors', () => {
      errorHandler.handle(new AppError('First'));
      errorHandler.handle(new AppError('Second'));
      errorHandler.handle(new AppError('Third'));

      const recent = errorHandler.getRecentErrors(2);
      expect(recent[0].message).toBe('Second');
      expect(recent[1].message).toBe('Third');
    });

    it('clearQueue empties the queue', () => {
      errorHandler.handle(new AppError('Error'));
      expect(errorHandler.getRecentErrors(10)).toHaveLength(1);

      errorHandler.clearQueue();
      expect(errorHandler.getRecentErrors(10)).toHaveLength(0);
    });

    it('limits queue to maxQueueSize (100)', () => {
      // Add 105 errors
      for (let i = 0; i < 105; i++) {
        errorHandler.handle(new AppError(`Error ${i}`));
      }

      const recent = errorHandler.getRecentErrors(200);
      expect(recent).toHaveLength(100);

      // First error should be Error 5 (0-4 were shifted out)
      expect(recent[0].message).toBe('Error 5');
    });

    it('maintains FIFO order when queue overflows', () => {
      for (let i = 0; i < 102; i++) {
        errorHandler.handle(new AppError(`Error ${i}`));
      }

      const recent = errorHandler.getRecentErrors(100);
      // Oldest remaining should be Error 2 (0 and 1 shifted out)
      expect(recent[0].message).toBe('Error 2');
      // Most recent should be Error 101
      expect(recent[99].message).toBe('Error 101');
    });
  });

  // =========================================================================
  // Configuration Tests
  // =========================================================================

  describe('Configuration', () => {
    it('updateConfig merges with existing config', () => {
      errorHandler.updateConfig({ logToConsole: false });
      errorHandler.handle(new AppError('Silent'));

      expect(mockLogger.warn).not.toHaveBeenCalled();

      // logToService should still be true
      expect(mockTrackError).toHaveBeenCalled();
    });

    it('can disable all logging', () => {
      errorHandler.updateConfig({
        logToConsole: false,
        logToService: false,
        showUserNotification: false,
      });

      errorHandler.handle(
        new AppError('Fully silent', { severity: ErrorSeverity.CRITICAL })
      );

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockTrackError).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Utility Functions Tests
  // =========================================================================

  describe('Utility functions', () => {
    describe('handleNetworkError', () => {
      it('creates NETWORK category error with MEDIUM severity', () => {
        handleNetworkError('Connection failed');

        const recent = errorHandler.getRecentErrors(1);
        expect(recent[0].category).toBe(ErrorCategory.NETWORK);
        expect(recent[0].severity).toBe(ErrorSeverity.MEDIUM);
        expect(recent[0].message).toBe('Connection failed');
      });

      it('accepts context', () => {
        handleNetworkError('Failed', { url: '/api/test' });

        const recent = errorHandler.getRecentErrors(1);
        expect(recent[0].context).toEqual({ url: '/api/test' });
      });
    });

    describe('handleValidationError', () => {
      it('creates VALIDATION category error with LOW severity', () => {
        handleValidationError('Invalid input');

        const recent = errorHandler.getRecentErrors(1);
        expect(recent[0].category).toBe(ErrorCategory.VALIDATION);
        expect(recent[0].severity).toBe(ErrorSeverity.LOW);
      });
    });

    describe('handleAuthError', () => {
      it('creates AUTHENTICATION category error with HIGH severity', () => {
        handleAuthError('Session expired');

        const recent = errorHandler.getRecentErrors(1);
        expect(recent[0].category).toBe(ErrorCategory.AUTHENTICATION);
        expect(recent[0].severity).toBe(ErrorSeverity.HIGH);
      });
    });

    describe('handleCriticalError', () => {
      it('creates SYSTEM category error with CRITICAL severity', () => {
        handleCriticalError('Database connection lost');

        const recent = errorHandler.getRecentErrors(1);
        expect(recent[0].category).toBe(ErrorCategory.SYSTEM);
        expect(recent[0].severity).toBe(ErrorSeverity.CRITICAL);
      });
    });
  });

  // =========================================================================
  // Enum Values Tests
  // =========================================================================

  describe('Enums', () => {
    it('ErrorSeverity has correct values', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });

    it('ErrorCategory has correct values', () => {
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
      expect(ErrorCategory.AUTHORIZATION).toBe('authorization');
      expect(ErrorCategory.BUSINESS_LOGIC).toBe('business_logic');
      expect(ErrorCategory.SYSTEM).toBe('system');
      expect(ErrorCategory.UNKNOWN).toBe('unknown');
    });
  });
});
