import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ChatWindow from './ChatWindow';
import type { DecryptedMessage } from '@/types/messaging';

expect.extend(toHaveNoViolations);

// Mock hooks to prevent complex dependency loading
vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  shortcuts: {
    previousItem: vi.fn(() => ({ key: 'ArrowUp', handler: vi.fn() })),
    closeModal: vi.fn(() => ({ key: 'Escape', handler: vi.fn() })),
  },
}));

vi.mock('@/hooks/useReadReceipts', () => ({
  useReadReceipts: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

describe('ChatWindow Accessibility', () => {
  const mockMessages: DecryptedMessage[] = [
    {
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'user-1',
      content: 'Hello there!',
      sequence_number: 1,
      created_at: new Date().toISOString(),
      read_at: null,
      delivered_at: null,
      edited: false,
      edited_at: null,
      deleted: false,
      isOwn: false,
      senderName: 'Other User',
    },
  ];

  const defaultProps = {
    conversationId: 'conv-1',
    messages: mockMessages,
    onSendMessage: vi.fn(),
    participantName: 'Test Participant',
  };

  it('should have no accessibility violations', async () => {
    const { container } = render(<ChatWindow {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible header with participant name', () => {
    render(<ChatWindow {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: /test participant/i })
    ).toBeInTheDocument();
  });

  it('should show blocked user alert with role="alert"', () => {
    render(<ChatWindow {...defaultProps} isBlocked={true} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/blocked/i);
  });

  it('should have accessible message input', () => {
    render(<ChatWindow {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /message input/i });
    expect(input).toBeInTheDocument();
  });

  it('should have data-testid for component identification', () => {
    render(<ChatWindow {...defaultProps} />);
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });
});
