import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ConnectionManager from './ConnectionManager';

expect.extend(toHaveNoViolations);

describe('ConnectionManager Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ConnectionManager />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<ConnectionManager />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<ConnectionManager />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('tabs should have aria-selected attributes', () => {
    render(<ConnectionManager />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);

    // First tab (received) should be selected by default
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[3]).toHaveAttribute('aria-selected', 'false');
  });

  describe('Roving TabIndex keyboard navigation', () => {
    it('ArrowRight moves focus to next tab', () => {
      render(<ConnectionManager />);
      const tabs = screen.getAllByRole('tab');

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');

      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });

      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
    });

    it('ArrowLeft moves focus to previous tab', () => {
      render(<ConnectionManager />);
      const tabs = screen.getAllByRole('tab');

      // Move to second tab first
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });

    it('Home moves focus to first tab', () => {
      render(<ConnectionManager />);
      const tabs = screen.getAllByRole('tab');

      // Move to last tab
      fireEvent.keyDown(tabs[0], { key: 'End' });
      expect(tabs[3]).toHaveAttribute('tabindex', '0');

      // Press Home
      fireEvent.keyDown(tabs[3], { key: 'Home' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[3]).toHaveAttribute('tabindex', '-1');
    });

    it('End moves focus to last tab', () => {
      render(<ConnectionManager />);
      const tabs = screen.getAllByRole('tab');

      fireEvent.keyDown(tabs[0], { key: 'End' });

      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      expect(tabs[3]).toHaveAttribute('tabindex', '0');
    });
  });
});
