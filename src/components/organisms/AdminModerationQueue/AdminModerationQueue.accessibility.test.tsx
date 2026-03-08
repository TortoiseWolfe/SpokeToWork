/**
 * AdminModerationQueue Accessibility Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T130 - Accessibility audit for AdminModerationQueue component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AdminModerationQueue from './AdminModerationQueue';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';

expect.extend(toHaveNoViolations);

const mockItems: ModerationQueueItem[] = [
  {
    id: 'contrib-1',
    type: 'contribution',
    user_id: 'user-1',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
    private_company_id: 'private-1',
    private_company_name: 'Test Company',
  },
  {
    id: 'edit-1',
    type: 'edit_suggestion',
    user_id: 'user-2',
    status: 'pending',
    created_at: '2024-01-16T10:00:00Z',
    shared_company_id: 'shared-1',
    shared_company_name: 'Existing Company',
    field_name: 'website',
    old_value: 'https://old.example.com',
    new_value: 'https://new.example.com',
    reason: 'URL updated',
  },
];

describe('AdminModerationQueue Accessibility', () => {
  it('has no axe violations with queue items', async () => {
    const { container } = render(<AdminModerationQueue items={mockItems} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when empty', async () => {
    const { container } = render(<AdminModerationQueue items={[]} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when loading', async () => {
    const { container } = render(<AdminModerationQueue items={[]} isLoading />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with only contributions', async () => {
    const contributions = mockItems.filter(
      (item) => item.type === 'contribution'
    );
    const { container } = render(
      <AdminModerationQueue items={contributions} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with only edit suggestions', async () => {
    const edits = mockItems.filter((item) => item.type === 'edit_suggestion');
    const { container } = render(<AdminModerationQueue items={edits} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
