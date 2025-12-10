import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteBuilder from './RouteBuilder';

// Mock hooks
vi.mock('@/hooks/useRoutes', () => ({
  useRoutes: vi.fn(() => ({
    createRoute: vi.fn().mockResolvedValue({
      id: 'new-route',
      name: 'Test Route',
      color: '#3B82F6',
    }),
    updateRoute: vi.fn().mockResolvedValue({
      id: 'existing-route',
      name: 'Updated Route',
      color: '#3B82F6',
    }),
    deleteRoute: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: vi.fn(() => ({
    profile: {
      home_address: '123 Test St',
      home_latitude: 35.1667,
      home_longitude: -84.8667,
    },
    isLoading: false,
  })),
}));

describe('RouteBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create mode with empty form', () => {
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      expect(screen.getByText('Create Route')).toBeInTheDocument();
      expect(screen.getByLabelText(/route name/i)).toHaveValue('');
    });

    it('pre-fills start/end with home address', () => {
      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText('Latitude *')).toHaveValue('35.1667');
      expect(screen.getByPlaceholderText('Longitude *')).toHaveValue(
        '-84.8667'
      );
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
      const { useRoutes } = require('@/hooks/useRoutes');
      const mockCreateRoute = vi
        .fn()
        .mockResolvedValue({ id: 'new', name: 'Test' });
      useRoutes.mockReturnValue({
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
      const { useRoutes } = require('@/hooks/useRoutes');
      const mockDeleteRoute = vi.fn().mockResolvedValue(undefined);
      useRoutes.mockReturnValue({
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
      const { useUserProfile } = require('@/hooks/useUserProfile');
      useUserProfile.mockReturnValue({
        profile: {
          home_address: null,
          home_latitude: null,
          home_longitude: null,
        },
        isLoading: false,
      });

      render(<RouteBuilder onSave={mockOnSave} onClose={mockOnClose} />);

      expect(screen.getByText(/no home address set/i)).toBeInTheDocument();
      expect(screen.getByText(/go to settings/i)).toBeInTheDocument();
    });
  });
});
