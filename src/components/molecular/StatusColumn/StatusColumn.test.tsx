import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusColumn from './StatusColumn';

const mockApps = [
  {
    id: '1',
    applicant_name: 'Jane Doe',
    company_name: 'Acme',
    position_title: 'Dev',
    status: 'applied',
    date_applied: '2026-02-20',
  },
  {
    id: '2',
    applicant_name: 'John Smith',
    company_name: 'TechCo',
    position_title: 'PM',
    status: 'applied',
    date_applied: '2026-02-18',
  },
];

describe('StatusColumn', () => {
  it('renders status heading', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={mockApps}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: /applied/i })
    ).toBeInTheDocument();
  });

  it('renders count badge', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={mockApps}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders application cards', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={mockApps}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders empty state when no applications', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={[]}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText(/no applications/i)).toBeInTheDocument();
  });

  it('has region landmark with aria-label', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={mockApps}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('region', { name: /applied applications/i })
    ).toBeInTheDocument();
  });

  it('accepts and applies className prop', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={[]}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
        className="custom-class"
      />
    );
    expect(
      screen.getByRole('region', { name: /applied applications/i }).className
    ).toContain('custom-class');
  });
});
