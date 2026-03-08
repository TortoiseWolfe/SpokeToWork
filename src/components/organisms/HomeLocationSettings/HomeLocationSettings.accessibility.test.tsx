import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HomeLocationSettings from './HomeLocationSettings';

expect.extend(toHaveNoViolations);

// Mock the geocoding module
vi.mock('@/lib/companies/geocoding', () => ({
  geocode: vi.fn().mockResolvedValue({
    latitude: 40.7128,
    longitude: -74.006,
    displayName: '123 Main St',
    confidence: 0.9,
  }),
}));

// Mock the CoordinateMap component
vi.mock('@/components/molecular/CoordinateMap', () => ({
  default: ({ testId }: { testId?: string }) => (
    <div
      data-testid={testId || 'coordinate-map'}
      role="application"
      aria-label="Map"
    >
      Mock Map
    </div>
  ),
}));

describe('HomeLocationSettings Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<HomeLocationSettings />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form labels', () => {
    render(<HomeLocationSettings />);

    // Address input should have a label
    const addressInput = screen.getByPlaceholderText('Enter your home address');
    expect(addressInput).toHaveAttribute('id', 'home-address');

    // Slider should have a label
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('id', 'radius-slider');
  });

  it('should have accessible slider with ARIA attributes', () => {
    render(<HomeLocationSettings />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '20');
    expect(slider).toHaveAttribute('aria-valuetext', '20 miles');
  });

  it('should have focusable elements in proper order', () => {
    const { container } = render(<HomeLocationSettings />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    expect(focusableElements.length).toBeGreaterThan(0);

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper heading structure', () => {
    render(<HomeLocationSettings />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Home Location Settings');
  });

  it('should have semantic HTML structure', () => {
    const { container } = render(<HomeLocationSettings />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Buttons should have accessible names
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
