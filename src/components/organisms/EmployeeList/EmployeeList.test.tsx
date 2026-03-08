import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import EmployeeList from './EmployeeList';
import type { TeamMember } from '@/types/company';

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

describe('EmployeeList', () => {
  it('renders loading spinner when loading', () => {
    render(<EmployeeList {...defaultProps} loading={true} />);
    expect(
      screen.getByRole('status', { name: /loading team members/i })
    ).toBeInTheDocument();
  });

  it('renders error alert', () => {
    render(<EmployeeList {...defaultProps} error="Network error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  it('renders empty state when no members', () => {
    render(<EmployeeList {...defaultProps} members={[]} />);
    expect(screen.getByText(/no team members yet/i)).toBeInTheDocument();
  });

  it('renders member name and email', () => {
    render(<EmployeeList {...defaultProps} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders member role title', () => {
    render(<EmployeeList {...defaultProps} />);
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders member count', () => {
    render(<EmployeeList {...defaultProps} />);
    expect(screen.getByText(/1 member/i)).toBeInTheDocument();
  });

  it('shows add form when Add Employee clicked', async () => {
    render(<EmployeeList {...defaultProps} />);
    await userEvent.click(
      screen.getByRole('button', { name: /add employee/i })
    );
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('calls onAdd with form data', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole('button', { name: /add employee/i })
    );

    await userEvent.type(screen.getByLabelText(/name/i), 'Bob Jones');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@example.com');
    await userEvent.type(screen.getByLabelText(/role/i), 'Designer');
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-03-01');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Bob Jones',
      email: 'bob@example.com',
      role_title: 'Designer',
      start_date: '2026-03-01',
    });
  });

  it('calls onRemove when remove confirmed', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onRemove={onRemove} />);

    await userEvent.click(
      screen.getByRole('button', { name: /remove alice smith/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onRemove).toHaveBeenCalledWith('tm-1');
  });

  it('does not call onRemove when cancel clicked', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onRemove={onRemove} />);

    await userEvent.click(
      screen.getByRole('button', { name: /remove alice smith/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('hides add form after successful add', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole('button', { name: /add employee/i })
    );
    await userEvent.type(screen.getByLabelText(/name/i), 'Bob Jones');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@example.com');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    // Form should be hidden after successful add
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

  // ---- Inline edit tests ----

  it('shows Edit button for each member', () => {
    render(<EmployeeList {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /edit alice smith/i })
    ).toBeInTheDocument();
  });

  it('clicking Edit shows input fields pre-filled with current values', async () => {
    render(<EmployeeList {...defaultProps} />);
    await userEvent.click(
      screen.getByRole('button', { name: /edit alice smith/i })
    );

    const nameInput = screen.getByLabelText(/edit name/i);
    const emailInput = screen.getByLabelText(/edit email/i);
    const roleInput = screen.getByLabelText(/edit role/i);
    const dateInput = screen.getByLabelText(/edit start date/i);

    expect(nameInput).toHaveValue('Alice Smith');
    expect(emailInput).toHaveValue('alice@example.com');
    expect(roleInput).toHaveValue('Developer');
    expect(dateInput).toHaveValue('2026-01-15');
  });

  it('clicking Cancel exits edit mode without calling onUpdate', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onUpdate={onUpdate} />);

    await userEvent.click(
      screen.getByRole('button', { name: /edit alice smith/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onUpdate).not.toHaveBeenCalled();
    // Should be back to static display
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('clicking Save calls onUpdate with changed fields only', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onUpdate={onUpdate} />);

    await userEvent.click(
      screen.getByRole('button', { name: /edit alice smith/i })
    );

    const roleInput = screen.getByLabelText(/edit role/i);
    await userEvent.clear(roleInput);
    await userEvent.type(roleInput, 'Senior Developer');

    // Find the Save button in the edit row (not the add form save)
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    await userEvent.click(saveButtons[0]);

    expect(onUpdate).toHaveBeenCalledWith('tm-1', {
      role_title: 'Senior Developer',
    });
  });

  it('does not call onUpdate when no fields changed', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<EmployeeList {...defaultProps} onUpdate={onUpdate} />);

    await userEvent.click(
      screen.getByRole('button', { name: /edit alice smith/i })
    );

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    await userEvent.click(saveButtons[0]);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('edit mode hides Remove button for that row', async () => {
    render(<EmployeeList {...defaultProps} />);
    await userEvent.click(
      screen.getByRole('button', { name: /edit alice smith/i })
    );

    expect(
      screen.queryByRole('button', { name: /remove alice smith/i })
    ).not.toBeInTheDocument();
  });

  it('clicking Edit cancels pending remove confirmation', async () => {
    const secondMember: TeamMember = {
      ...mockMember,
      id: 'tm-2',
      name: 'Bob Jones',
      email: 'bob@example.com',
    };
    render(
      <EmployeeList {...defaultProps} members={[mockMember, secondMember]} />
    );

    // Start remove confirmation on Alice
    await userEvent.click(
      screen.getByRole('button', { name: /remove alice smith/i })
    );
    expect(
      screen.getByRole('button', { name: /confirm/i })
    ).toBeInTheDocument();

    // Click Edit on Bob — should cancel Alice's remove confirmation
    await userEvent.click(
      screen.getByRole('button', { name: /edit bob jones/i })
    );
    expect(
      screen.queryByRole('button', { name: /confirm/i })
    ).not.toBeInTheDocument();
  });
});
