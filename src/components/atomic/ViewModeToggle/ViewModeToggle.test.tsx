import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ViewModeToggle from './ViewModeToggle';

describe('ViewModeToggle', () => {
  it('renders table and kanban buttons', () => {
    render(<ViewModeToggle value="table" onChange={vi.fn()} />);
    expect(
      screen.getByRole('radio', { name: 'Table view' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Kanban view' })
    ).toBeInTheDocument();
  });

  it('marks current mode as checked', () => {
    render(<ViewModeToggle value="kanban" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Kanban view' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Table view' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('calls onChange when a mode is clicked', () => {
    const onChange = vi.fn();
    render(<ViewModeToggle value="table" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Kanban view' }));
    expect(onChange).toHaveBeenCalledWith('kanban');
  });
});
