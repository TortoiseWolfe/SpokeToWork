import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageInput from './MessageInput';

describe('MessageInput', () => {
  it('renders input field', () => {
    const mockOnSend = vi.fn();
    render(<MessageInput onSend={mockOnSend} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const mockOnSend = vi.fn();
    const { container } = render(
      <MessageInput onSend={mockOnSend} className="custom-class" />
    );
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('custom-class');
  });

  /**
   * Character Count Tests (Feature 008)
   * Tests for FR-001: Character count must display "0 / 10000 characters" when empty
   */
  describe('character count display', () => {
    it('displays "0 / 10000 characters" when input is empty', () => {
      const mockOnSend = vi.fn();
      render(<MessageInput onSend={mockOnSend} />);
      expect(screen.getByText(/0 \/ 10000 characters/)).toBeInTheDocument();
    });

    it('increments character count when typing', () => {
      const mockOnSend = vi.fn();
      render(<MessageInput onSend={mockOnSend} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Hello' } });
      expect(screen.getByText(/5 \/ 10000 characters/)).toBeInTheDocument();
    });

    it('shows 0 when input is cleared', () => {
      const mockOnSend = vi.fn();
      render(<MessageInput onSend={mockOnSend} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByText(/0 \/ 10000 characters/)).toBeInTheDocument();
    });
  });

  /**
   * Regression tests for stuck typing indicator (Bug: "typing indicator shows
   * someone as typing long after they've closed the tab").
   *
   * MessageInput debounces onTypingChange: fires `true` on keystroke, schedules
   * `false` after 3s of inactivity. If the user closes the tab or navigates
   * away inside that 3s window, the cleanup previously only cleared the
   * timeout — it never fired the pending `false`. The peer's only recovery was
   * the 5s auto-expire on useTypingIndicator, which may not fire if Realtime
   * disconnects before the last `true` heartbeat decays.
   */
  describe('typing status on unmount', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls onTypingChange(false) on unmount if user was mid-typing', () => {
      vi.useFakeTimers();
      const mockOnSend = vi.fn();
      const mockOnTypingChange = vi.fn();
      const { unmount } = render(
        <MessageInput onSend={mockOnSend} onTypingChange={mockOnTypingChange} />
      );
      const input = screen.getByRole('textbox');

      // User types — fires true, arms 3s stop-typing timer
      fireEvent.change(input, { target: { value: 'Hello' } });
      expect(mockOnTypingChange).toHaveBeenLastCalledWith(true);

      mockOnTypingChange.mockClear();

      // User closes tab BEFORE the 3s timer fires
      unmount();

      // Cleanup MUST broadcast stop-typing so peer doesn't see stuck indicator
      expect(mockOnTypingChange).toHaveBeenCalledWith(false);
    });

    it('does NOT call onTypingChange(false) on unmount if user never typed', () => {
      const mockOnSend = vi.fn();
      const mockOnTypingChange = vi.fn();
      const { unmount } = render(
        <MessageInput onSend={mockOnSend} onTypingChange={mockOnTypingChange} />
      );

      unmount();

      expect(mockOnTypingChange).not.toHaveBeenCalled();
    });

    it('does NOT call onTypingChange(false) on unmount if already stopped (sent or cleared)', () => {
      const mockOnSend = vi.fn();
      const mockOnTypingChange = vi.fn();
      const { unmount } = render(
        <MessageInput onSend={mockOnSend} onTypingChange={mockOnTypingChange} />
      );
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.change(input, { target: { value: '' } }); // cleared → already fired false

      mockOnTypingChange.mockClear();

      unmount();

      // Already sent false — no double broadcast
      expect(mockOnTypingChange).not.toHaveBeenCalled();
    });
  });
});
