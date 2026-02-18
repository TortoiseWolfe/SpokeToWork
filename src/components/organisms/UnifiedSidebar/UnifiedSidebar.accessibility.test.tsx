import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import UnifiedSidebar from './UnifiedSidebar';

expect.extend(toHaveNoViolations);

// Mock child components
vi.mock('@/components/organisms/ConversationList', () => ({
  default: () => <div data-testid="conversation-list">ConversationList</div>,
}));

vi.mock('@/components/organisms/ConnectionManager', () => ({
  default: () => <div data-testid="connection-manager">ConnectionManager</div>,
}));

const defaultProps = {
  onConversationSelect: vi.fn(),
  onStartConversation: vi.fn().mockResolvedValue('conv-123'),
  activeTab: 'chats' as const,
  onTabChange: vi.fn(),
};

describe('UnifiedSidebar Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<UnifiedSidebar {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with connections tab active', async () => {
    const { container } = render(
      <UnifiedSidebar {...defaultProps} activeTab="connections" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<UnifiedSidebar {...defaultProps} />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<UnifiedSidebar {...defaultProps} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should have all interactive elements with 44px minimum touch targets', () => {
    render(<UnifiedSidebar {...defaultProps} />);

    // Check all tab buttons have min-h-11 class (44px)
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab).toHaveClass('min-h-11');
    });
  });

  it('should have tabs with proper ARIA roles', () => {
    render(<UnifiedSidebar {...defaultProps} />);

    // Check tablist exists
    expect(screen.getByRole('tablist')).toBeInTheDocument();

    // Check all tabs have role="tab" (Feature 038: 2 tabs only)
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    // Check active tab has aria-selected="true"
    const chatsTab = screen.getByRole('tab', { name: /chats/i });
    expect(chatsTab).toHaveAttribute('aria-selected', 'true');

    // Check inactive tabs have aria-selected="false"
    const connectionsTab = screen.getByRole('tab', { name: /connections/i });
    expect(connectionsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should have tabpanel for content area', () => {
    render(<UnifiedSidebar {...defaultProps} />);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('tabpanel should have id and aria-labelledby', () => {
    render(<UnifiedSidebar {...defaultProps} />);
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('id', 'unified-sidebar-tabpanel');
    expect(tabpanel).toHaveAttribute(
      'aria-labelledby',
      'unified-sidebar-tab-chats'
    );
  });

  it('tabs should have aria-controls pointing to tabpanel', () => {
    render(<UnifiedSidebar {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab).toHaveAttribute('aria-controls', 'unified-sidebar-tabpanel');
    });
  });

  describe('Roving TabIndex keyboard navigation', () => {
    it('ArrowRight moves focus to next tab', () => {
      render(<UnifiedSidebar {...defaultProps} />);
      const tabs = screen.getAllByRole('tab');

      // First tab should have tabIndex=0 (active)
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');

      // Press ArrowRight on first tab
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });

      // Second tab should now have tabIndex=0
      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
    });

    it('ArrowLeft moves focus to previous tab', () => {
      render(<UnifiedSidebar {...defaultProps} activeTab="connections" />);
      const tabs = screen.getAllByRole('tab');

      // Second tab is active, press ArrowLeft
      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });

    it('Home moves focus to first tab', () => {
      render(<UnifiedSidebar {...defaultProps} activeTab="connections" />);
      const tabs = screen.getAllByRole('tab');

      fireEvent.keyDown(tabs[1], { key: 'Home' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });

    it('End moves focus to last tab', () => {
      render(<UnifiedSidebar {...defaultProps} />);
      const tabs = screen.getAllByRole('tab');

      fireEvent.keyDown(tabs[0], { key: 'End' });

      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
    });

    it('ArrowRight wraps from last to first tab', () => {
      render(<UnifiedSidebar {...defaultProps} activeTab="connections" />);
      const tabs = screen.getAllByRole('tab');

      fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });

      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });
  });
});
