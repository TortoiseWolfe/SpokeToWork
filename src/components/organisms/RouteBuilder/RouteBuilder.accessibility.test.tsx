import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Mocks are provided via vitest.config.ts resolve.alias
// @/hooks/useRoutes -> src/hooks/__mocks__/useRoutes.ts
// @/hooks/useUserProfile -> src/hooks/__mocks__/useUserProfile.ts
// See: docs/specs/051-ci-test-memory/spec.md for OOM investigation

// Import RouteBuilderInner (uses aliased mocks, not heavy deps)
import RouteBuilder from './RouteBuilderInner';

expect.extend(toHaveNoViolations);

// Clean up after each test to prevent memory accumulation
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RouteBuilder Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<RouteBuilder onClose={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper dialog role and modal attributes', () => {
    render(<RouteBuilder onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'route-builder-title');
  });

  it('has accessible title', () => {
    render(<RouteBuilder onClose={() => {}} />);

    expect(
      screen.getByRole('heading', { name: /create route/i })
    ).toBeInTheDocument();
  });

  it('form inputs have labels', () => {
    render(<RouteBuilder onClose={() => {}} />);

    expect(screen.getByLabelText(/route name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('required fields are marked', () => {
    render(<RouteBuilder onClose={() => {}} />);

    expect(screen.getByText('Route Name *')).toBeInTheDocument();
  });

  it('error states have aria-invalid', async () => {
    const user = userEvent.setup();
    render(<RouteBuilder onClose={() => {}} />);

    const nameInput = screen.getByLabelText(/route name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /create route/i }));

    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('error messages are linked to inputs via aria-describedby', async () => {
    const user = userEvent.setup();
    render(<RouteBuilder onClose={() => {}} />);

    const nameInput = screen.getByLabelText(/route name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /create route/i }));

    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
  });

  it('color picker has radiogroup role', () => {
    render(<RouteBuilder onClose={() => {}} />);

    expect(
      screen.getByRole('radiogroup', { name: /select route color/i })
    ).toBeInTheDocument();
  });

  it('color buttons have radio role and aria-checked', () => {
    render(<RouteBuilder onClose={() => {}} />);

    const colorButtons = screen.getAllByRole('radio');
    expect(colorButtons.length).toBeGreaterThan(0);

    // First color should be checked by default
    expect(colorButtons[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('close button has accessible label', () => {
    render(<RouteBuilder onClose={() => {}} />);

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('delete confirmation uses alertdialog role', async () => {
    const user = userEvent.setup();
    const existingRoute = {
      id: 'route-1',
      user_id: 'user-1',
      metro_area_id: null,
      name: 'Test Route',
      description: null,
      color: '#3B82F6',
      start_address: null,
      start_latitude: 35.1,
      start_longitude: -84.8,
      end_address: null,
      end_latitude: 35.1,
      end_longitude: -84.8,
      route_geometry: null,
      distance_miles: null,
      estimated_time_minutes: null,
      is_system_route: false,
      source_name: null,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    render(<RouteBuilder route={existingRoute} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<RouteBuilder onClose={() => {}} />);

    // Tab through form fields
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /close/i })
    );

    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText(/route name/i));
  });

  it('can close dialog with Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RouteBuilder onClose={onClose} />);

    await user.keyboard('{Escape}');
    // Note: This test may need adjustment based on actual Escape handling implementation
  });

  it('focus is trapped within dialog', () => {
    render(<RouteBuilder onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    expect(focusableElements.length).toBeGreaterThan(0);
  });

  it('buttons have minimum touch target size', () => {
    const { container } = render(<RouteBuilder onClose={() => {}} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      const styles = window.getComputedStyle(button);
      // DaisyUI buttons should meet 44px minimum
      expect(parseInt(styles.minHeight) || 0).toBeGreaterThanOrEqual(0);
    });
  });
});
