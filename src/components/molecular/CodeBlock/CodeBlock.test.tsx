import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('renders code content correctly', () => {
    const code = 'console.log("Hello, World!");';
    const { container } = render(<CodeBlock>{code}</CodeBlock>);

    // Code is now rendered as highlighted HTML, not plain text
    const codeElement = container.querySelector('code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement?.textContent).toContain('console');
    expect(codeElement?.textContent).toContain('log');
    expect(codeElement?.textContent).toContain('Hello, World!');
  });

  it('renders with custom className', () => {
    const { container } = render(
      <CodeBlock className="custom-class">test code</CodeBlock>
    );

    const pre = container.querySelector('pre');
    expect(pre).toHaveClass('custom-class');
    expect(pre).toHaveClass('overflow-x-auto');
  });

  it('shows copy button on hover', async () => {
    render(<CodeBlock>test code</CodeBlock>);

    const copyButton = screen.getByRole('button', {
      name: /copy code to clipboard/i,
    });
    expect(copyButton).toHaveClass('opacity-0');
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const code = 'const x = 42;';
    render(<CodeBlock>{code}</CodeBlock>);

    const copyButton = screen.getByRole('button', {
      name: /copy code to clipboard/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(code);
    });
  });

  it('shows success message after copying', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<CodeBlock>test code</CodeBlock>);

    const copyButton = screen.getByRole('button', {
      name: /copy code to clipboard/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('handles complex nested React elements', async () => {
    const code = (
      <code>
        <span>function</span> <span>test</span>() {'{'} <span>return</span> 42;{' '}
        {'}'}
      </code>
    );

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<CodeBlock>{code}</CodeBlock>);

    const copyButton = screen.getByRole('button', {
      name: /copy code to clipboard/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        'function test() { return 42; }'
      );
    });
  });

  it('shows error when clipboard API is not available', async () => {
    // Remove clipboard API (use defineProperty for happy-dom compatibility)
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    try {
      render(<CodeBlock>fallback test</CodeBlock>);

      const copyButton = screen.getByRole('button', {
        name: /copy code to clipboard/i,
      });
      fireEvent.click(copyButton);

      // Should show error state when clipboard API unavailable
      await waitFor(() => {
        expect(screen.getByLabelText('Copy failed')).toBeInTheDocument();
      });
    } finally {
      // Restore clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    }
  });

  it('sets data-language attribute when language prop is provided', () => {
    const { container } = render(
      <CodeBlock language="javascript">const x = 1;</CodeBlock>
    );

    const code = container.querySelector('code');
    expect(code).toHaveAttribute('data-language', 'javascript');
  });
});
