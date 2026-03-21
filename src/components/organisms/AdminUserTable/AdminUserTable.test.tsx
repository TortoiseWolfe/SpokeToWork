import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminUserTable from './AdminUserTable';
import type { AdminUser } from '@/hooks/useAdminUsers';

const u = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u1',
  email: 'alice@example.com',
  display_name: 'Alice',
  username: 'alice',
  role: 'worker',
  is_admin: false,
  created_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: '2026-03-01T00:00:00Z',
  company_names: [],
  ...over,
});

describe('AdminUserTable', () => {
  it('renders user rows with email + display name', () => {
    render(<AdminUserTable users={[u()]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders role badge and admin flag independently', () => {
    render(
      <AdminUserTable
        users={[u({ id: 'u2', role: 'employer', is_admin: true })]}
      />
    );
    expect(screen.getByText('employer')).toBeInTheDocument();
    expect(screen.getByLabelText('Admin flag')).toBeInTheDocument();
  });

  it('renders company chips', () => {
    render(
      <AdminUserTable users={[u({ company_names: ['Acme', 'Globex'] })]} />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  it('renders em-dash when last_sign_in_at is null', () => {
    render(<AdminUserTable users={[u({ last_sign_in_at: null })]} />);
    const row = screen.getByTestId('user-row-u1');
    expect(row).toHaveTextContent('—');
  });

  it('shows spinner when loading', () => {
    render(<AdminUserTable users={[]} isLoading />);
    expect(screen.getByLabelText('Loading users')).toBeInTheDocument();
  });

  it('shows error alert', () => {
    render(<AdminUserTable users={[]} error={new Error('nope')} />);
    expect(screen.getByText(/nope/)).toBeInTheDocument();
  });

  it('shows empty state when users is empty', () => {
    render(<AdminUserTable users={[]} />);
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('falls back to username when display_name is null', () => {
    render(
      <AdminUserTable users={[u({ display_name: null, username: 'bob' })]} />
    );
    expect(screen.getByText('bob')).toBeInTheDocument();
  });
});
