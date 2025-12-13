import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    created_at: new Date().toISOString(),
    encrypted_content: '',
    encryption_key_id: null,
    read_at: null,
    delivered_at: null,
    edited: false,
    edited_at: null,
    deleted: false,
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
});
