import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import MessageBubble from './MessageBubble';
import type { DecryptedMessage } from '@/types/messaging';

expect.extend(toHaveNoViolations);

// Mock validation functions to control edit/delete window
vi.mock('@/lib/messaging/validation', () => ({
  isWithinEditWindow: () => true,
  isWithinDeleteWindow: () => true,
}));

describe('MessageBubble Accessibility', () => {
  const baseMessage: DecryptedMessage = {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    content: 'Test message content',
    sequence_number: 1,
    created_at: new Date().toISOString(),
    deleted: false,
    edited: false,
    edited_at: null,
    delivered_at: null,
    read_at: null,
    isOwn: true,
    senderName: 'Test User',
  };

  it('should have no accessibility violations for own message', async () => {
    const { container } = render(<MessageBubble message={baseMessage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for received message', async () => {
    const receivedMessage = { ...baseMessage, isOwn: false };
    const { container } = render(<MessageBubble message={receivedMessage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible edit button with aria-label', () => {
    render(
      <MessageBubble
        message={baseMessage}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const editButton = screen.getByRole('button', { name: /edit message/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should have accessible delete button with aria-label', () => {
    render(
      <MessageBubble
        message={baseMessage}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const deleteButton = screen.getByRole('button', {
      name: /delete message/i,
    });
    expect(deleteButton).toBeInTheDocument();
  });

  it('should render deleted message placeholder accessibly', async () => {
    const deletedMessage = { ...baseMessage, deleted: true };
    const { container } = render(<MessageBubble message={deletedMessage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText(/message deleted/i)).toBeInTheDocument();
  });

  it('should render decryption error message with accessible description', async () => {
    const errorMessage = { ...baseMessage, decryptionError: true };
    const { container } = render(<MessageBubble message={errorMessage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(
      screen.getByRole('group', {
        name: /encrypted message that cannot be decrypted/i,
      })
    ).toBeInTheDocument();
  });

  describe('delete confirmation modal', () => {
    it('should open modal with proper dialog role when delete is clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MessageBubble
          message={baseMessage}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const deleteButton = screen.getByRole('button', {
        name: /delete message/i,
      });
      await user.click(deleteButton);

      // happy-dom doesn't expose <dialog> to getByRole, query DOM directly
      const modal = container.querySelector('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-labelledby', 'delete-modal-title');
    });

    it('should focus Cancel button when delete modal opens', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MessageBubble
          message={baseMessage}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const deleteButton = screen.getByRole('button', {
        name: /delete message/i,
      });
      await user.click(deleteButton);

      // Cancel button should receive focus automatically
      // happy-dom doesn't expose buttons inside <dialog> to getByRole, use getByLabelText
      // waitFor is needed because useEffect runs after React's state update cycle
      const cancelButton = screen.getByLabelText('Cancel deletion');
      await waitFor(() => {
        expect(cancelButton).toHaveFocus();
      });
    });

    it('should have no accessibility violations when modal is open', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <MessageBubble
          message={baseMessage}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const deleteButton = screen.getByRole('button', {
        name: /delete message/i,
      });
      await user.click(deleteButton);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
