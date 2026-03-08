import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorksSection from './HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders the "How It Works" heading', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'How It Works' })
    ).toBeInTheDocument();
  });

  it('renders worker step titles', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Sign Up' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Add Companies' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Plan Your Route' })
    ).toBeInTheDocument();
  });

  it('renders employer step titles', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Sign Up as Employer' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Build Your Team' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Set Schedules' })
    ).toBeInTheDocument();
  });

  it('renders worker step descriptions', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText("Track where you've applied")).toBeInTheDocument();
    expect(
      screen.getByText('Generate an optimized bicycle route')
    ).toBeInTheDocument();
  });

  it('renders employer step descriptions', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByText('Create your employer account')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Add connections to your roster')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Assign weekly shifts in one click')
    ).toBeInTheDocument();
  });

  it('renders step numbers for both paths', () => {
    render(<HowItWorksSection />);
    // Each path has 1, 2, 3 — so 2 of each
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getAllByText('3')).toHaveLength(2);
  });

  it('renders path labels', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('For Job Seekers')).toBeInTheDocument();
    expect(screen.getByText('For Employers')).toBeInTheDocument();
  });

  it('renders the section with aria-label "How it works"', () => {
    render(<HowItWorksSection />);
    const section = screen.getByRole('region', { name: 'How it works' });
    expect(section).toBeInTheDocument();
  });

  it('accepts and applies className prop', () => {
    render(<HowItWorksSection className="custom-class" />);
    const section = screen.getByRole('region', { name: 'How it works' });
    expect(section.className).toContain('custom-class');
  });
});
