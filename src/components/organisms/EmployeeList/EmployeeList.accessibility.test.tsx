import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmployeeList from './EmployeeList';
import type { TeamMember } from '@/types/company';

expect.extend(toHaveNoViolations);

const mockMember: TeamMember = {
  id: 'tm-1',
  company_id: 'comp-1',
  user_id: null,
  name: 'Alice Smith',
  email: 'alice@example.com',
  role_title: 'Developer',
  start_date: '2026-01-15',
  added_by: 'user-1',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

const defaultProps = {
  members: [mockMember],
  loading: false,
  error: null,
  onAdd: vi.fn().mockResolvedValue(undefined),
  onUpdate: vi.fn().mockResolvedValue(undefined),
  onRemove: vi.fn().mockResolvedValue(undefined),
};

describe('EmployeeList Accessibility', () => {
  it('should have no violations with members', async () => {
    const { container } = render(<EmployeeList {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations when loading', async () => {
    const { container } = render(
      <EmployeeList {...defaultProps} loading={true} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations when empty', async () => {
    const { container } = render(
      <EmployeeList {...defaultProps} members={[]} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with error', async () => {
    const { container } = render(
      <EmployeeList {...defaultProps} error="Something went wrong" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations in edit mode', async () => {
    const { container } = render(<EmployeeList {...defaultProps} />);
    await userEvent.click(
      screen.getByRole('button', { name: /edit alice smith/i })
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('member count uses aria-live', () => {
    render(<EmployeeList {...defaultProps} />);
    const count = screen.getByText(/1 member/i);
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  it('remove buttons have accessible labels', () => {
    render(<EmployeeList {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /remove alice smith/i })
    ).toBeInTheDocument();
  });

  it('edit buttons have accessible labels', () => {
    render(<EmployeeList {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /edit alice smith/i })
    ).toBeInTheDocument();
  });
});
