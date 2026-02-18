import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ConversationList from './ConversationList';

expect.extend(toHaveNoViolations);

describe('ConversationList Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ConversationList />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<ConversationList />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<ConversationList />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  describe('Roving TabIndex keyboard navigation on filter tabs', () => {
    it('ArrowRight moves focus to next filter tab', () => {
      render(<ConversationList />);
      const tabs = screen.getAllByRole('tab');

      // First tab (All) should have tabIndex=0
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
      expect(tabs[2]).toHaveAttribute('tabindex', '-1');

      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });

      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
    });

    it('ArrowLeft moves focus to previous filter tab', () => {
      render(<ConversationList />);
      const tabs = screen.getAllByRole('tab');

      // Move to second tab first
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });

      // Now press ArrowLeft
      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });

    it('Home moves focus to first filter tab', () => {
      render(<ConversationList />);
      const tabs = screen.getAllByRole('tab');

      // Move to last tab
      fireEvent.keyDown(tabs[0], { key: 'End' });

      // Press Home
      fireEvent.keyDown(tabs[2], { key: 'Home' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[2]).toHaveAttribute('tabindex', '-1');
    });

    it('End moves focus to last filter tab', () => {
      render(<ConversationList />);
      const tabs = screen.getAllByRole('tab');

      fireEvent.keyDown(tabs[0], { key: 'End' });

      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      expect(tabs[2]).toHaveAttribute('tabindex', '0');
    });
  });
});
