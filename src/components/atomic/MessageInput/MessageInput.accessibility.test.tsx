import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import MessageInput from './MessageInput';

expect.extend(toHaveNoViolations);

describe('MessageInput Accessibility', () => {
  const mockOnSend = vi.fn();

  it('should have no accessibility violations', async () => {
    const { container } = render(<MessageInput onSend={mockOnSend} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible textarea with aria-label', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox', { name: /message input/i });
    expect(textarea).toBeInTheDocument();
  });

  it('should have accessible send button with aria-label', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).toBeInTheDocument();
  });

  it('should have character count with aria-live for screen readers', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const charCount = screen.getByText(/0 \/ 10000 characters/i);
    expect(charCount).toHaveAttribute('aria-live', 'polite');
  });

  it('should associate textarea with character count via aria-describedby', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-describedby', 'char-count');
  });
});
