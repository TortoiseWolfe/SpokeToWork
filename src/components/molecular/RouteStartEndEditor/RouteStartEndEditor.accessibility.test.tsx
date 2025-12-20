import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteStartEndEditor from './RouteStartEndEditor';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

const mockHomeLocation = {
  address: '123 Home St, Cleveland, TN',
  latitude: 35.1667,
  longitude: -84.8667,
};

describe('RouteStartEndEditor Accessibility', () => {
  it('should not have any accessibility violations with home location', async () => {
    const { container } = render(
      <RouteStartEndEditor homeLocation={mockHomeLocation} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have any accessibility violations without home location', async () => {
    const { container } = render(
      <RouteStartEndEditor
        homeLocation={null}
        startPoint={{
          type: 'custom',
          address: '',
          latitude: null,
          longitude: null,
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have any accessibility violations with one-way route', async () => {
    const { container } = render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        isRoundTrip={false}
        endPoint={{
          type: 'custom',
          address: '',
          latitude: null,
          longitude: null,
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper radiogroup role for start point type', () => {
    render(<RouteStartEndEditor homeLocation={mockHomeLocation} />);
    expect(
      screen.getByRole('radiogroup', { name: 'Start point type' })
    ).toBeInTheDocument();
  });

  it('has proper radiogroup role for end point type when not round trip', () => {
    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        isRoundTrip={false}
      />
    );
    expect(
      screen.getByRole('radiogroup', { name: 'End point type' })
    ).toBeInTheDocument();
  });

  it('has radio buttons with aria-checked attribute', () => {
    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        startPoint={{
          type: 'home',
          address: null,
          latitude: null,
          longitude: null,
        }}
      />
    );

    const homeButton = screen.getAllByRole('radio', { name: 'Home' })[0];
    const customButton = screen.getAllByRole('radio', { name: 'Custom' })[0];

    expect(homeButton).toHaveAttribute('aria-checked', 'true');
    expect(customButton).toHaveAttribute('aria-checked', 'false');
  });

  it('has labeled checkbox for round trip toggle', () => {
    render(<RouteStartEndEditor homeLocation={mockHomeLocation} />);
    expect(screen.getByLabelText('Round trip route')).toBeInTheDocument();
  });

  it('has labeled input fields when custom is selected', () => {
    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        startPoint={{
          type: 'custom',
          address: '',
          latitude: null,
          longitude: null,
        }}
      />
    );

    expect(screen.getByLabelText('Start address')).toBeInTheDocument();
    expect(screen.getByLabelText('Start latitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Start longitude')).toBeInTheDocument();
  });

  it('has alert role on warning when no home location', () => {
    render(<RouteStartEndEditor homeLocation={null} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('maintains focus management when toggling between home and custom', async () => {
    const { rerender } = render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        startPoint={{
          type: 'home',
          address: null,
          latitude: null,
          longitude: null,
        }}
      />
    );

    // Home type shows read-only display
    expect(screen.queryByLabelText('Start address')).not.toBeInTheDocument();

    // Rerender with custom type
    rerender(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        startPoint={{
          type: 'custom',
          address: '',
          latitude: null,
          longitude: null,
        }}
      />
    );

    // Custom type shows input fields
    expect(screen.getByLabelText('Start address')).toBeInTheDocument();
  });

  it('disabled inputs have proper disabled state', () => {
    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        disabled={true}
        startPoint={{
          type: 'custom',
          address: '',
          latitude: null,
          longitude: null,
        }}
      />
    );

    expect(screen.getByLabelText('Round trip route')).toBeDisabled();
    expect(screen.getByLabelText('Start address')).toBeDisabled();
    expect(screen.getByLabelText('Start latitude')).toBeDisabled();
    expect(screen.getByLabelText('Start longitude')).toBeDisabled();
  });

  it('fieldsets can be disabled together', () => {
    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        disabled={true}
        startPoint={{
          type: 'custom',
          address: '',
          latitude: null,
          longitude: null,
        }}
      />
    );

    const fieldsets = document.querySelectorAll('fieldset');
    fieldsets.forEach((fieldset) => {
      expect(fieldset).toBeDisabled();
    });
  });
});
