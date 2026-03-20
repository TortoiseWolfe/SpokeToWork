import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  beforeEach(() => {
    // happy-dom has no layout; innerHeight defaults to 768.
    // Pin it so offset math is deterministic.
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });
  });

  it('renders children', () => {
    render(
      <BottomSheet>
        <div data-testid="sheet-content">hello</div>
      </BottomSheet>
    );
    expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
  });

  it('renders a drag handle', () => {
    render(<BottomSheet>content</BottomSheet>);
    expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
  });

  it('handle has 44px min touch target', () => {
    render(<BottomSheet>content</BottomSheet>);
    const handle = screen.getByTestId('bottom-sheet-handle');
    expect(handle.className).toMatch(/min-h-11/);
  });

  it('starts at peek by default', () => {
    render(<BottomSheet>content</BottomSheet>);
    const sheet = screen.getByTestId('bottom-sheet');
    // peek @ 1000vh = translateY(880px)
    expect(sheet.style.transform).toBe('translateY(880px)');
  });

  it('respects initialSnap prop', () => {
    render(<BottomSheet initialSnap="half">content</BottomSheet>);
    const sheet = screen.getByTestId('bottom-sheet');
    // half @ 1000vh = translateY(500px)
    expect(sheet.style.transform).toBe('translateY(500px)');
  });

  it('has role=dialog and aria-label', () => {
    render(<BottomSheet ariaLabel="Company list">content</BottomSheet>);
    const sheet = screen.getByRole('dialog', { name: 'Company list' });
    expect(sheet).toBeInTheDocument();
  });

  it('is aria-modal=false at peek', () => {
    render(<BottomSheet initialSnap="peek">content</BottomSheet>);
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute(
      'aria-modal',
      'false'
    );
  });

  it('is aria-modal=true at half/full', () => {
    render(<BottomSheet initialSnap="half">content</BottomSheet>);
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute(
      'aria-modal',
      'true'
    );
  });

  it('traps Tab inside the sheet when open', () => {
    render(
      <>
        <button data-testid="outside">outside</button>
        <BottomSheet initialSnap="half">
          <button data-testid="first">first</button>
          <button data-testid="last">last</button>
        </BottomSheet>
      </>
    );
    // Trap moves focus to first tabbable on activate.
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('restores focus on close (unmount)', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const { unmount } = render(
      <BottomSheet initialSnap="half">
        <button>inside</button>
      </BottomSheet>
    );
    expect(outside).not.toHaveFocus();
    unmount();
    expect(outside).toHaveFocus();
    outside.remove();
  });
});
