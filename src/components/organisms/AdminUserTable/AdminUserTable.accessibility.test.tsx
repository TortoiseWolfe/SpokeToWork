import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import AdminUserTable from './AdminUserTable';

describe('AdminUserTable a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <AdminUserTable
        users={[
          {
            id: 'u1',
            email: 'alice@example.com',
            display_name: 'Alice',
            username: 'alice',
            role: 'employer',
            is_admin: false,
            created_at: '2026-01-01T00:00:00Z',
            last_sign_in_at: '2026-03-01T00:00:00Z',
            company_names: ['Acme'],
          },
        ]}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
