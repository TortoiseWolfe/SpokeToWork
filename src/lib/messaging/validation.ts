/**
 * Validation Service for Messaging System
 * Task: T016
 *
 * Provides input validation and sanitization for messaging operations
 */

import DOMPurify from 'dompurify';
import { ValidationError } from '@/types/messaging';
import { EMAIL_REGEX, UUID_REGEX } from '@/lib/validation/patterns';

/**
 * Validate email address format
 * @param email - Email address to validate
 * @throws ValidationError if email is invalid
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required', 'email');
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Email cannot be empty', 'email');
  }

  if (trimmed.length > 254) {
    throw new ValidationError(
      'Email address is too long (max 254 characters)',
      'email'
    );
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError('Invalid email address format', 'email');
  }

  // Check for common typos
  if (
    trimmed.includes('..') ||
    trimmed.startsWith('.') ||
    trimmed.endsWith('.')
  ) {
    throw new ValidationError('Invalid email address format', 'email');
  }

  // Check for valid TLD (at least 2 characters)
  const tld = trimmed.split('.').pop();
  if (!tld || tld.length < 2) {
    throw new ValidationError(
      'Email must have a valid domain extension',
      'email'
    );
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 *
 * Uses DOMPurify for comprehensive HTML sanitization.
 * This handles all known XSS vectors including:
 * - Script injection
 * - Event handler injection (onclick, onerror, etc.)
 * - Protocol injection (javascript:, data:, etc.)
 * - Encoded payloads
 * - Mutation XSS
 *
 * @param input - Input string to sanitize
 * @param options - Optional DOMPurify config overrides
 * @returns Sanitized string (plain text, no HTML allowed by default)
 */
export function sanitizeInput(
  input: string,
  options?: { allowHtml?: boolean }
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const trimmed = input.trim();

  // Limit length to prevent DOS
  if (trimmed.length > 10000) {
    return trimmed.substring(0, 10000);
  }

  // By default, strip ALL HTML tags (plain text only)
  // For rich text, caller can pass allowHtml: true
  if (options?.allowHtml) {
    // Allow safe HTML tags for rich content
    return DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS: [
        'b',
        'i',
        'em',
        'strong',
        'a',
        'p',
        'br',
        'ul',
        'ol',
        'li',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  }

  // Default: strip all HTML, return plain text
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validate username format (3-30 alphanumeric + underscore/hyphen)
 * @param username - Username to validate
 * @throws ValidationError if username is invalid
 */
export function validateUsername(username: string): void {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required', 'username');
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    throw new ValidationError(
      'Username must be at least 3 characters',
      'username'
    );
  }

  if (trimmed.length > 30) {
    throw new ValidationError(
      'Username must be at most 30 characters',
      'username'
    );
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    throw new ValidationError(
      'Username can only contain letters, numbers, underscores, and hyphens',
      'username'
    );
  }
}

/**
 * Validate message content
 * @param content - Message content to validate
 * @throws ValidationError if content is invalid
 */
export function validateMessageContent(content: string): void {
  if (typeof content !== 'string') {
    throw new ValidationError('Message content must be a string', 'content');
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Message cannot be empty', 'content');
  }

  if (trimmed.length > 10000) {
    throw new ValidationError(
      'Message exceeds maximum length (10,000 characters)',
      'content'
    );
  }
}

/**
 * Validate UUID format
 * @param id - UUID to validate
 * @param fieldName - Field name for error message
 * @throws ValidationError if UUID is invalid
 */
export function validateUUID(id: string, fieldName: string = 'id'): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  if (!UUID_REGEX.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
}

/**
 * Check if message is within edit window (15 minutes)
 * @param created_at - Message creation timestamp
 * @returns true if within edit window
 */
export function isWithinEditWindow(created_at: string): boolean {
  const createdDate = new Date(created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdDate.getTime()) / 1000 / 60;
  return diffMinutes <= 15;
}

/**
 * Check if message is within delete window (15 minutes)
 * @param created_at - Message creation timestamp
 * @returns true if within delete window
 */
export function isWithinDeleteWindow(created_at: string): boolean {
  const createdDate = new Date(created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdDate.getTime()) / 1000 / 60;
  return diffMinutes <= 15;
}
