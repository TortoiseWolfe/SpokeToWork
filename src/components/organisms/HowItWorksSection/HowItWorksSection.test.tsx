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

  it('renders all 3 step titles', () => {
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

  it('renders all 3 step descriptions', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByText('Create your account')
    ).toBeInTheDocument();
    expect(
      screen.getByText("Track where you've applied")
    ).toBeInTheDocument();
    expect(
      screen.getByText('Generate an optimized bicycle route')
    ).toBeInTheDocument();
  });

  it('renders step numbers "1", "2", "3"', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
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
