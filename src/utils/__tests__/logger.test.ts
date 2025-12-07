import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test with different NODE_ENV values
describe('logger utility', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;
    vi.resetModules();
  });

  describe('in development mode', () => {
    beforeEach(async () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
      vi.resetModules();
    });

    it('should call console.log in development', async () => {
      const { logger } = await import('../logger');
      logger.log('test message');
      expect(console.log).toHaveBeenCalledWith('test message');
    });

    it('should call console.error in development', async () => {
      const { logger } = await import('../logger');
      logger.error('error message');
      expect(console.error).toHaveBeenCalledWith('error message');
    });

    it('should call console.warn in development', async () => {
      const { logger } = await import('../logger');
      logger.warn('warning message');
      expect(console.warn).toHaveBeenCalledWith('warning message');
    });

    it('should call console.info in development', async () => {
      const { logger } = await import('../logger');
      logger.info('info message');
      expect(console.info).toHaveBeenCalledWith('info message');
    });

    it('should pass multiple arguments', async () => {
      const { logger } = await import('../logger');
      logger.log('message', { data: 'test' }, 123);
      expect(console.log).toHaveBeenCalledWith(
        'message',
        { data: 'test' },
        123
      );
    });
  });

  describe('in production mode', () => {
    beforeEach(async () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
      vi.resetModules();
    });

    it('should not call console.log in production', async () => {
      const { logger } = await import('../logger');
      logger.log('test message');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not call console.error in production', async () => {
      const { logger } = await import('../logger');
      logger.error('error message');
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should not call console.warn in production', async () => {
      const { logger } = await import('../logger');
      logger.warn('warning message');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not call console.info in production', async () => {
      const { logger } = await import('../logger');
      logger.info('info message');
      expect(console.info).not.toHaveBeenCalled();
    });
  });
});
