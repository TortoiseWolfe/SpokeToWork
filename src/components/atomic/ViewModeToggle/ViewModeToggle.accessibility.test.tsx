import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ViewModeToggle from './ViewModeToggle';

describe('ViewModeToggle Accessibility', () => {
  it('has radiogroup role with label', () => {
    render(<ViewModeToggle value="table" onChange={vi.fn()} />);
    expect(
      screen.getByRole('radiogroup', { name: 'View mode' })
    ).toBeInTheDocument();
  });

  it('radio buttons have accessible names', () => {
    render(<ViewModeToggle value="table" onChange={vi.fn()} />);
    expect(
      screen.getByRole('radio', { name: 'Table view' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Kanban view' })
    ).toBeInTheDocument();
  });
});
