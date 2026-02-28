import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatusFunnel from './StatusFunnel';

describe('StatusFunnel Accessibility', () => {
  it('has a group role for pipeline stages', () => {
    render(
      <StatusFunnel
        statusCounts={{ applied: 3 }}
        totalCount={3}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );
    expect(
      screen.getByRole('group', { name: /pipeline stages/i })
    ).toBeInTheDocument();
  });

  it('each stage button has aria-label with count', () => {
    render(
      <StatusFunnel
        statusCounts={{ applied: 7 }}
        totalCount={7}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /applied: 7 applications/i })
    ).toBeInTheDocument();
  });

  it('All button has aria-pressed when active', () => {
    render(
      <StatusFunnel
        statusCounts={{}}
        totalCount={0}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /all applications/i })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
