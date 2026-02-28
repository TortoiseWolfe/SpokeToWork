import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MemberScheduleDrawer from './MemberScheduleDrawer';

const member = {
  user_id: 'u1',
  display_name: 'Alice Chen',
  avatar_url: null,
  joined_at: '2026-01-01',
};

const defaultProps = {
  member,
  existingShifts: [],
  weekStart: '2026-03-02',
  businessHours: { open: '09:00', close: '17:00' },
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe('MemberScheduleDrawer Accessibility', () => {
  it('has dialog role with aria-modal', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has accessible label with member name', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    expect(
      screen.getByLabelText("Alice Chen's weekly schedule")
    ).toBeInTheDocument();
  });

  it('close button has aria-label', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
  });

  it('each day checkbox has aria-label', () => {
    render(<MemberScheduleDrawer {...defaultProps} />);
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByLabelText(`Enable ${day}`)).toBeInTheDocument();
    }
  });
});
