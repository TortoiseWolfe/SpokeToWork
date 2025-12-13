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

      const latInputs = screen.getAllByPlaceholderText('Latitude *');
      const lngInputs = screen.getAllByPlaceholderText('Longitude *');
      expect(latInputs[0]).toHaveValue('35.1667');
      expect(lngInputs[0]).toHaveValue('-84.8667');
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

      const colorButtons = screen.getAllByRole('radio');
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
    it('copies start to end when round trip button clicked', async () => {
      const user = userEvent.setup();
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      // Change start location
      const startLat = screen.getAllByPlaceholderText('Latitude *')[0];
      await user.clear(startLat);
      await user.type(startLat, '36.0');

      // Click round trip button
      await user.click(screen.getByRole('button', { name: /round trip/i }));

      // End should match start
      const endLat = screen.getAllByPlaceholderText('Latitude *')[1];
      expect(endLat).toHaveValue('36.0');
    });
  });

  describe('Home Location Prompt', () => {
    it('shows prompt when no home location', () => {
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

      expect(screen.getByText(/no home address set/i)).toBeInTheDocument();
      expect(screen.getByText(/go to settings/i)).toBeInTheDocument();
    });
  });
});
