import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatusFunnel from './StatusFunnel';
import type { JobApplicationStatus } from '@/types/company';

const mockCounts: Partial<Record<JobApplicationStatus, number>> = {
  not_applied: 2,
  applied: 5,
  screening: 3,
  interviewing: 1,
  offer: 1,
  closed: 0,
};

describe('StatusFunnel', () => {
  it('renders all pipeline stages', () => {
    render(
      <StatusFunnel
        statusCounts={mockCounts}
        totalCount={12}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Screening')).toBeInTheDocument();
    expect(screen.getByText('Interviewing')).toBeInTheDocument();
  });

  it('shows total count in All button', () => {
    render(
      <StatusFunnel
        statusCounts={mockCounts}
        totalCount={12}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onFilterChange when a stage is clicked', () => {
    const handler = vi.fn();
    render(
      <StatusFunnel
        statusCounts={mockCounts}
        totalCount={12}
        activeFilter="all"
        onFilterChange={handler}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /applied: 5 applications/i })
    );
    expect(handler).toHaveBeenCalledWith('applied');
  });

  it('toggles filter off when clicking active stage', () => {
    const handler = vi.fn();
    render(
      <StatusFunnel
        statusCounts={mockCounts}
        totalCount={12}
        activeFilter="applied"
        onFilterChange={handler}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /applied: 5 applications/i })
    );
    expect(handler).toHaveBeenCalledWith('all');
  });

  it('marks active stage with aria-pressed', () => {
    render(
      <StatusFunnel
        statusCounts={mockCounts}
        totalCount={12}
        activeFilter="screening"
        onFilterChange={vi.fn()}
      />
    );
    const btn = screen.getByRole('button', {
      name: /screening: 3 applications/i,
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
