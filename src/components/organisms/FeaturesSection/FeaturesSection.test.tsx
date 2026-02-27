import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeaturesSection from './FeaturesSection';

// Mock next/link to render as plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock illustration components
vi.mock('@/components/atomic/illustrations', () => ({
  IsometricDesk: () => <div data-testid="illustration-desk" />,
  IsometricBicycle: () => <div data-testid="illustration-bicycle" />,
  IsometricCalendar: () => <div data-testid="illustration-calendar" />,
  IsometricChat: () => <div data-testid="illustration-chat" />,
}));

describe('FeaturesSection', () => {
  it('renders the "Features" heading', () => {
    render(<FeaturesSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Features' })
    ).toBeInTheDocument();
  });

  it('renders all 4 feature card titles', () => {
    render(<FeaturesSection />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Track Companies' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Plan Routes' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Schedule Visits' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Stay Connected' })
    ).toBeInTheDocument();
  });

  it('links secondary cards to correct pages', () => {
    render(<FeaturesSection />);
    expect(
      screen.getByRole('link', { name: 'Track Companies' })
    ).toHaveAttribute('href', '/companies');
    expect(
      screen.getByRole('link', { name: 'Schedule Visits' })
    ).toHaveAttribute('href', '/schedule');
    expect(
      screen.getByRole('link', { name: 'Stay Connected' })
    ).toHaveAttribute('href', '/messages');
  });

  it('renders Plan Routes as a spotlight, not in the grid', () => {
    render(<FeaturesSection />);
    // Spotlight uses h3; the 3 grid cards also use h3.
    // Plan Routes heading should exist exactly once.
    const headings = screen.getAllByRole('heading', {
      level: 3,
      name: /Plan Routes/i,
    });
    expect(headings).toHaveLength(1);
    // And there should be exactly 3 *other* feature headings.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('spotlight CTA links to /map', () => {
    render(<FeaturesSection />);
    expect(screen.getByRole('link', { name: /Open the Map/i })).toHaveAttribute(
      'href',
      '/map'
    );
  });

  it('renders all 4 illustrations', () => {
    render(<FeaturesSection />);
    expect(screen.getByTestId('illustration-desk')).toBeInTheDocument();
    expect(screen.getByTestId('illustration-bicycle')).toBeInTheDocument();
    expect(screen.getByTestId('illustration-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('illustration-chat')).toBeInTheDocument();
  });

  it('renders the section with aria-label "Features"', () => {
    render(<FeaturesSection />);
    const section = screen.getByRole('region', { name: 'Features' });
    expect(section).toBeInTheDocument();
  });

  it('accepts and applies className prop', () => {
    render(<FeaturesSection className="custom-class" />);
    const section = screen.getByRole('region', { name: 'Features' });
    expect(section.className).toContain('custom-class');
  });

  it('renders feature descriptions', () => {
    render(<FeaturesSection />);
    expect(
      screen.getByText(
        'Organize your target employers, track contacts, and manage your pipeline.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Map bicycle-friendly routes between interviews and drop-offs.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Keep a calendar of upcoming interviews, follow-ups, and deadlines.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Message hiring managers and get real-time updates on your applications.'
      )
    ).toBeInTheDocument();
  });
});
