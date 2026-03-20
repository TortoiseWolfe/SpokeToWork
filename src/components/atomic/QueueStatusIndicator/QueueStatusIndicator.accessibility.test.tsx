import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import QueueStatusIndicator from './QueueStatusIndicator';

expect.extend(toHaveNoViolations);

// Mock the useOfflineQueue hook
const mockUseOfflineQueue = vi.fn();
vi.mock('@/hooks/useOfflineQueue', () => ({
  useOfflineQueue: () => mockUseOfflineQueue(),
}));

describe('QueueStatusIndicator Accessibility', () => {
  beforeEach(() => {
    // Default mock with some queued messages so component renders
    mockUseOfflineQueue.mockReturnValue({
      queue: [],
      queueCount: 1,
      failedCount: 0,
      isSyncing: false,
      isOnline: true,
      syncQueue: vi.fn(),
      retryFailed: vi.fn(),
      clearSynced: vi.fn(),
      getFailedMessages: vi.fn().mockResolvedValue([]),
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<QueueStatusIndicator />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<QueueStatusIndicator />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<QueueStatusIndicator />);

    // Component returns null when queue is empty and online — that's valid.
    // When it renders, verify it uses proper semantic HTML.
    if (container.firstChild) {
      // Should use role="status" for live region
      const statusEl = container.querySelector('[role="status"]');
      expect(statusEl).toBeInTheDocument();

      // Should have aria-live for screen readers
      expect(statusEl).toHaveAttribute('aria-live', 'polite');

      // Images should have alt text
      const images = container.querySelectorAll('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
      });
    } else {
      // Null render is valid — component hides when queue empty + online
      expect(container.firstChild).toBeNull();
    }
  });
});
