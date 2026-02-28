import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import ProfileBanner from './ProfileBanner';

expect.extend(toHaveNoViolations);

describe('ProfileBanner — accessibility', () => {
  it('has no axe violations — email user', async () => {
    const { container } = render(
      <ProfileBanner
        displayName="Maya Chen"
        email="maya@example.com"
        avatarUrl={null}
        provider={null}
        role="worker"
        joinedAt="2025-06-15T10:30:00Z"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations — OAuth user with avatar + actions', async () => {
    const { container } = render(
      <ProfileBanner
        displayName="Raj Reviewer"
        email="raj@example.com"
        avatarUrl="https://example.com/raj.jpg"
        provider="Github"
        role="employer"
        joinedAt="2024-01-01T00:00:00Z"
        actions={
          <a href="/account" className="btn btn-primary min-h-11">
            Settings
          </a>
        }
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
