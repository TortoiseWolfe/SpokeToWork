import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks are provided via vitest.config.ts resolve.alias
// @/hooks/useRoutes -> src/hooks/__mocks__/useRoutes.ts
// @/hooks/useUserProfile -> src/hooks/__mocks__/useUserProfile.ts
// See: docs/specs/051-ci-test-memory/spec.md for OOM investigation

// Import mocks to enable per-test customization
import { useRoutes } from '@/hooks/useRoutes';
import { useUserProfile } from '@/hooks/useUserProfile';

// Import RouteBuilderInner (uses aliased mocks, not heavy deps)
import RouteBuilder from './RouteBuilderInner';

describe('RouteBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create mode with empty form', () => {
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      expect(
        screen.getByRole('heading', { name: /create route/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/route name/i)).toHaveValue('');
    });

    it('pre-fills start/end with home address', () => {
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // When home location is set and start type is 'home', display shows the address
      // The mock useUserProfile provides home_address: '123 Test St, Test City, TS 12345'
      // Address appears in both the Start Point display and Summary section
      const addressElements = screen.getAllByText(/123 Test St/);
      expect(addressElements.length).toBeGreaterThanOrEqual(1);
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // Clear pre-filled values
      const nameInput = screen.getByLabelText(/route name/i);
      await user.clear(nameInput);

      await user.click(screen.getByRole('button', { name: /create route/i }));

      expect(screen.getByText(/route name is required/i)).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      // Use imported mock directly (not require - aliases don't work with CommonJS)
      const mockCreateRoute = vi
        .fn()
        .mockResolvedValue({ id: 'new', name: 'Test' });
      (useRoutes as ReturnType<typeof vi.fn>).mockReturnValue({
        createRoute: mockCreateRoute,
        updateRoute: vi.fn(),
        deleteRoute: vi.fn(),
      });

      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/route name/i), 'Morning Loop');
      await user.click(screen.getByRole('button', { name: /create route/i }));

      await waitFor(() => {
        expect(mockCreateRoute).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Morning Loop',
          })
        );
      });
    });

    it('calls onClose on cancel', async () => {
      const user = userEvent.setup();
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const existingRoute = {
      id: 'route-1',
      user_id: 'user-1',
      metro_area_id: null,
      name: 'Existing Route',
      description: 'A test route',
      color: '#10B981',
      start_address: '123 Start St',
      start_latitude: 35.1,
      start_longitude: -84.8,
      end_address: '456 End St',
      end_latitude: 35.2,
      end_longitude: -84.9,
      route_geometry: null,
      distance_miles: 5,
      estimated_time_minutes: 30,
      is_system_route: false,
      source_name: null,
      is_active: true,
      start_type: 'home' as const,
      end_type: 'home' as const,
      is_round_trip: true,
      last_optimized_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    it('renders edit mode with route data', () => {
      render(
        <RouteBuilder
          route={existingRoute}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Edit Route')).toBeInTheDocument();
      expect(screen.getByLabelText(/route name/i)).toHaveValue(
        'Existing Route'
      );
    });

    it('shows delete button in edit mode', () => {
      render(
        <RouteBuilder
          route={existingRoute}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('shows delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(
        <RouteBuilder
          route={existingRoute}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/delete route\?/i)).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('calls deleteRoute on confirm', async () => {
      const user = userEvent.setup();
      // Use imported mock directly (not require - aliases don't work with CommonJS)
      const mockDeleteRoute = vi.fn().mockResolvedValue(undefined);
      (useRoutes as ReturnType<typeof vi.fn>).mockReturnValue({
        createRoute: vi.fn(),
        updateRoute: vi.fn(),
        deleteRoute: mockDeleteRoute,
      });

      render(
        <RouteBuilder
          route={existingRoute}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      // Click delete in confirmation dialog
      const confirmButton = screen.getAllByRole('button', {
        name: /delete/i,
      })[1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteRoute).toHaveBeenCalledWith('route-1');
      });
    });
  });

  describe('Color Picker', () => {
    it('renders all color options', () => {
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // Color picker has radio buttons + RouteStartEndEditor has Home/Custom toggles
      // Look for color radios specifically by their aria-label pattern
      const colorButtons = screen.getAllByRole('radio', { name: /color #/i });
      expect(colorButtons.length).toBe(8); // ROUTE_COLORS has 8 colors
    });

    it('can select a different color', async () => {
      const user = userEvent.setup();
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      const emeraldColor = screen.getByRole('radio', {
        name: /color #10b981/i,
      });
      await user.click(emeraldColor);

      expect(emeraldColor).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Round Trip Feature', () => {
    it('shows round trip checkbox and hides end point when checked', () => {
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // Round trip checkbox should be present and checked by default
      const roundTripCheckbox = screen.getByLabelText(/round trip route/i);
      expect(roundTripCheckbox).toBeChecked();

      // End Point fieldset should not be visible when round trip is enabled
      expect(screen.queryByText('End Point')).not.toBeInTheDocument();

      // Summary should show "Round Trip"
      expect(screen.getByText('Round Trip')).toBeInTheDocument();
    });

    it('shows end point when round trip is unchecked', async () => {
      const user = userEvent.setup();
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // Uncheck round trip
      const roundTripCheckbox = screen.getByLabelText(/round trip route/i);
      await user.click(roundTripCheckbox);

      // End Point fieldset should now be visible
      expect(screen.getByText('End Point')).toBeInTheDocument();

      // Summary should show "One-Way"
      expect(screen.getByText('One-Way')).toBeInTheDocument();
    });
  });

  describe('Home Location Prompt', () => {
    it('shows warning when no home location', () => {
      // Use imported mock directly (not require - aliases don't work with CommonJS)
      (useUserProfile as ReturnType<typeof vi.fn>).mockReturnValue({
        profile: {
          home_address: null,
          home_latitude: null,
          home_longitude: null,
        },
        loading: false,
        isLoading: false,
      });

      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // RouteStartEndEditor shows warning with link to settings
      expect(screen.getByText(/no home address set/i)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /set in settings/i })
      ).toBeInTheDocument();
    });

    it('disables Home button when no home location', () => {
      (useUserProfile as ReturnType<typeof vi.fn>).mockReturnValue({
        profile: {
          home_address: null,
          home_latitude: null,
          home_longitude: null,
        },
        loading: false,
        isLoading: false,
      });

      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // Home buttons should be disabled when no home location
      const homeButtons = screen.getAllByRole('radio', { name: 'Home' });
      homeButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
