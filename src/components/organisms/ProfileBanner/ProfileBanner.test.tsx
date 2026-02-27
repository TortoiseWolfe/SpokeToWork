import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProfileBanner, { type ProfileBannerProps } from './ProfileBanner';

const baseProps: ProfileBannerProps = {
  displayName: 'Maya Chen',
  email: 'maya@example.com',
  avatarUrl: null,
  provider: null,
  role: 'worker',
  joinedAt: '2025-06-15T10:30:00Z',
};

describe('ProfileBanner', () => {
  it('renders display name as a level-1 heading', () => {
    render(<ProfileBanner {...baseProps} />);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Maya Chen',
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders email text', () => {
    render(<ProfileBanner {...baseProps} />);
    expect(screen.getByText('maya@example.com')).toBeInTheDocument();
  });

  it('renders the xl avatar', () => {
    const { container } = render(<ProfileBanner {...baseProps} />);
    // xl size = w-24 h-24
    expect(container.querySelector('.w-24.h-24')).toBeInTheDocument();
  });

  it('shows "Email" as provider when provider is null', () => {
    render(<ProfileBanner {...baseProps} provider={null} />);
    expect(screen.getByText(/Signed in with Email/i)).toBeInTheDocument();
  });

  it('shows OAuth provider name when provided', () => {
    render(<ProfileBanner {...baseProps} provider="Google" />);
    expect(screen.getByText(/Signed in with Google/i)).toBeInTheDocument();
  });

  it('renders role badge', () => {
    render(<ProfileBanner {...baseProps} role="employer" />);
    expect(screen.getByText(/employer/i)).toBeInTheDocument();
  });

  it('renders the join date formatted', () => {
    render(<ProfileBanner {...baseProps} joinedAt="2025-06-15T10:30:00Z" />);
    // toLocaleDateString en-US default: 6/15/2025 — match Jun + 2025
    expect(screen.getByText(/Jun.*2025/i)).toBeInTheDocument();
  });

  it('renders actions slot when provided', () => {
    render(
      <ProfileBanner
        {...baseProps}
        actions={<button type="button">Settings</button>}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Settings' })
    ).toBeInTheDocument();
  });

  it('omits role badge when role is null', () => {
    render(<ProfileBanner {...baseProps} role={null} />);
    expect(
      screen.queryByText(/worker|employer|admin/i)
    ).not.toBeInTheDocument();
  });
});
