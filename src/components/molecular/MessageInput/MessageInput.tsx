'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MESSAGE_CONSTRAINTS } from '@/types/messaging';
import { cn } from '@/lib/utils';

export interface MessageInputProps {
  /** Callback when message is sent */
  onSend: (content: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Disable input (e.g., when blocked) */
  disabled?: boolean;
  /** Whether a message is currently being sent */
  sending?: boolean;
  /** Callback when typing status changes */
  onTypingChange?: (isTyping: boolean) => void;
  /** Additional CSS classes */
  className?: string;
  /** Forward ref for textarea element */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /**
   * Text to put back in the box after a send failed.
   *
   * The input clears optimistically on send — right, because waiting for a
   * round trip makes the composer feel broken. But when the send then fails,
   * the user's typing was simply gone. Restoring it here is what stops a
   * failed send from destroying what they wrote.
   *
   * Carries a `token` because the same text can fail twice in a row; without
   * it the value would be unchanged and the effect would not re-fire.
   */
  restoreDraft?: { content: string; token: number } | null;
}

/**
 * MessageInput component
 * Tasks: T070-T072, T117 (integrated typing status)
 *
 * Features:
 * - Auto-expanding textarea
 * - Send button with 44px touch target
 * - Character count
 * - Message validation (max 10,000 chars, non-empty after trim)
 * - Enter to send, Cmd/Ctrl+Enter for newline
 * - Loading indicator when sending
 * - Typing status triggers (calls onTypingChange callback)
 *
 * @category atomic
 */
export default function MessageInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  sending = false,
  onTypingChange,
  className = '',
  inputRef,
  restoreDraft = null,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || internalRef; // Use forwarded ref if provided
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether onTypingChange(true) was emitted without a matching (false).
  // If the component unmounts while true (tab close, nav away), cleanup must
  // emit the final (false) so the peer isn't left with a stuck indicator.
  const isTypingRef = useRef(false);
  // Stable ref to latest onTypingChange for unmount cleanup (avoids stale
  // closure over the initial prop value)
  const onTypingChangeRef = useRef(onTypingChange);
  onTypingChangeRef.current = onTypingChange;

  // Put the text back after a failed send. Keyed on the token so the same
  // content failing twice still restores the second time.
  //
  // Only restores into an EMPTY box: if the user has already started typing
  // something new, silently overwriting it would be a worse bug than the one
  // this fixes. That case is rare — the failure usually arrives while the box
  // is still empty from the optimistic clear.
  const restoreTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!restoreDraft) return;
    if (restoreTokenRef.current === restoreDraft.token) return;
    restoreTokenRef.current = restoreDraft.token;
    setMessage((current) => (current === '' ? restoreDraft.content : current));
  }, [restoreDraft]);

  const charCount = message.length;
  const charLimit = MESSAGE_CONSTRAINTS.MAX_LENGTH;
  const remaining = charLimit - charCount;

  // Handle typing status changes
  const handleMessageChange = (value: string) => {
    setMessage(value);

    if (onTypingChange) {
      // User is typing if there's content
      if (value.length > 0) {
        isTypingRef.current = true;
        onTypingChange(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false;
          onTypingChangeRef.current?.(false);
        }, 3000);
      } else {
        // Clear typing status if input is empty
        isTypingRef.current = false;
        onTypingChange(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // If unmounting mid-type (tab close, nav away, conversation switch),
      // emit the pending stop-typing so the peer isn't stuck. Use the ref to
      // avoid stale closure over onTypingChange.
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingChangeRef.current?.(false);
      }
    };
  }, []);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message, textareaRef]);

  const handleSend = () => {
    setError(null);

    const trimmed = message.trim();

    if (trimmed.length < MESSAGE_CONSTRAINTS.MIN_LENGTH) {
      setError('Message cannot be empty');
      return;
    }

    if (trimmed.length > MESSAGE_CONSTRAINTS.MAX_LENGTH) {
      setError(
        `Message cannot exceed ${MESSAGE_CONSTRAINTS.MAX_LENGTH} characters`
      );
      return;
    }

    onSend(trimmed);
    setMessage('');
    setError(null);

    // Clear typing status after sending
    isTypingRef.current = false;
    if (onTypingChange) {
      onTypingChange(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Cmd/Ctrl+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || sending || charCount > charLimit;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="textarea textarea-bordered w-full resize-none"
            rows={1}
            aria-label="Message input"
            aria-describedby="char-count"
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={isDisabled}
          className="btn btn-primary min-h-11 min-w-11"
          aria-label="Send message"
        >
          {sending ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              <span className="hidden sm:inline">Sending...</span>
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>

      <div
        id="char-count"
        className={`text-xs ${
          remaining < 100 ? 'text-warning' : 'text-base-content/80'
        }`}
        aria-live="polite"
      >
        {charCount || 0} / {charLimit} characters
        {remaining < 100 && ` (${remaining} remaining)`}
      </div>
    </div>
  );
}
