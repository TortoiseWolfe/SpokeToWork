import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VisibilityControls } from './VisibilityControls';

describe('VisibilityControls', () => {
  it('renders profile toggle in correct state', () => {
    render(
      <VisibilityControls
        profilePublic={true}
        resumeVisibleTo="none"
        onChange={vi.fn()}
      />
    );
    const toggle = screen.getByRole('checkbox', {
      name: /profile visible to employers/i,
    });
    expect(toggle).toBeChecked();
  });

  it('renders resume radio in correct state', () => {
    render(
      <VisibilityControls
        profilePublic={false}
        resumeVisibleTo="applied"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('radio', { name: /applied/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /private/i })).not.toBeChecked();
    expect(
      screen.getByRole('radio', { name: /all employers/i })
    ).not.toBeChecked();
  });

  it('calls onChange with profile_public toggled', async () => {
    const onChange = vi.fn();
    render(
      <VisibilityControls
        profilePublic={false}
        resumeVisibleTo="none"
        onChange={onChange}
      />
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /profile visible to employers/i })
    );
    expect(onChange).toHaveBeenCalledWith({ profile_public: true });
  });

  it('calls onChange with resume_visible_to changed', async () => {
    const onChange = vi.fn();
    render(
      <VisibilityControls
        profilePublic={true}
        resumeVisibleTo="none"
        onChange={onChange}
      />
    );
    await userEvent.click(
      screen.getByRole('radio', { name: /all employers/i })
    );
    expect(onChange).toHaveBeenCalledWith({
      resume_visible_to: 'all_employers',
    });
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <VisibilityControls
        profilePublic={true}
        resumeVisibleTo="applied"
        onChange={vi.fn()}
        disabled={true}
      />
    );
    expect(
      screen.getByRole('checkbox', { name: /profile visible to employers/i })
    ).toBeDisabled();
    expect(screen.getByRole('radio', { name: /private/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /applied/i })).toBeDisabled();
    expect(
      screen.getByRole('radio', { name: /all employers/i })
    ).toBeDisabled();
  });

  it('shows helper text for each option', () => {
    render(
      <VisibilityControls
        profilePublic={true}
        resumeVisibleTo="none"
        onChange={vi.fn()}
      />
    );
    expect(
      screen.getByText(/only you can see your resumes/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/employers you applied to can download/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/any employer can download your default resume/i)
    ).toBeInTheDocument();
  });
});
