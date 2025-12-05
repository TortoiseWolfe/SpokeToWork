import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeLocationSettings from './HomeLocationSettings';
import type { HomeLocation } from '@/types/company';

// Mock the geocoding module
vi.mock('@/lib/companies/geocoding', () => ({
  geocode: vi.fn().mockResolvedValue({
    success: true,
    latitude: 40.7128,
    longitude: -74.006,
    displayName: '123 Main St, New York, NY',
  }),
}));

// Mock the CoordinateMap component
vi.mock('@/components/molecular/CoordinateMap', () => ({
  default: ({
    latitude,
    longitude,
    onCoordinateChange,
    testId,
  }: {
    latitude: number;
    longitude: number;
    onCoordinateChange?: (lat: number, lng: number) => void;
    testId?: string;
  }) => (
    <div data-testid={testId || 'coordinate-map'}>
      <span>
        Map at {latitude}, {longitude}
      </span>
      {onCoordinateChange && (
        <button
          onClick={() => onCoordinateChange(40.75, -73.99)}
          data-testid="mock-map-click"
        >
          Click Map
        </button>
      )}
    </div>
  ),
}));

describe('HomeLocationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<HomeLocationSettings />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with correct test id', () => {
    render(<HomeLocationSettings />);
    expect(screen.getByTestId('home-location-settings')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    const { container } = render(
      <HomeLocationSettings className={customClass} />
    );
    const element = container.querySelector('.custom-test-class');
    expect(element).toBeInTheDocument();
  });

  it('renders title and description', () => {
    render(<HomeLocationSettings />);
    expect(screen.getByText('Home Location Settings')).toBeInTheDocument();
    expect(screen.getByText(/Set your home location/)).toBeInTheDocument();
  });

  it('renders address input field', () => {
    render(<HomeLocationSettings />);
    expect(
      screen.getByPlaceholderText('Enter your home address')
    ).toBeInTheDocument();
  });

  it('renders geocode button', () => {
    render(<HomeLocationSettings />);
    expect(screen.getByRole('button', { name: 'Geocode' })).toBeInTheDocument();
  });

  it('renders radius slider with default value', () => {
    render(<HomeLocationSettings />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('20');
  });

  it('renders save button', () => {
    render(<HomeLocationSettings />);
    expect(
      screen.getByRole('button', { name: 'Save Home Location' })
    ).toBeInTheDocument();
  });

  it('renders map component', () => {
    render(<HomeLocationSettings />);
    expect(screen.getByTestId('home-location-map')).toBeInTheDocument();
  });

  it('pre-fills form with initial location', () => {
    const initialLocation: HomeLocation = {
      address: '456 Test St',
      latitude: 41.0,
      longitude: -75.0,
      radius_miles: 30,
    };

    render(<HomeLocationSettings initialLocation={initialLocation} />);

    expect(screen.getByDisplayValue('456 Test St')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveValue('30');
  });

  it('updates address on input change', () => {
    render(<HomeLocationSettings />);
    const input = screen.getByPlaceholderText('Enter your home address');

    fireEvent.change(input, { target: { value: '123 New Address' } });
    expect(input).toHaveValue('123 New Address');
  });

  it('updates radius on slider change', () => {
    render(<HomeLocationSettings />);
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '50' } });
    expect(slider).toHaveValue('50');
    expect(screen.getByText('50 miles')).toBeInTheDocument();
  });

  it('calls onSave with correct data', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    render(<HomeLocationSettings onSave={mockOnSave} />);

    // Enter address
    const input = screen.getByPlaceholderText('Enter your home address');
    fireEvent.change(input, { target: { value: '123 Test St' } });

    // Click geocode button
    const geocodeButton = screen.getByRole('button', { name: 'Geocode' });
    fireEvent.click(geocodeButton);

    await waitFor(() => {
      expect(screen.getByText(/Coordinates:/)).toBeInTheDocument();
    });

    // Change radius
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '25' } });

    // Click save
    const saveButton = screen.getByRole('button', {
      name: 'Save Home Location',
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.006,
        radius_miles: 25,
      });
    });
  });

  it('updates coordinates when map is clicked', () => {
    render(<HomeLocationSettings />);

    // Click the mock map
    const mapClickButton = screen.getByTestId('mock-map-click');
    fireEvent.click(mapClickButton);

    // Save button should be enabled now
    const saveButton = screen.getByRole('button', {
      name: 'Save Home Location',
    });
    expect(saveButton).not.toBeDisabled();
  });

  it('disables save button when no coordinates set', () => {
    render(<HomeLocationSettings />);

    const saveButton = screen.getByRole('button', {
      name: 'Save Home Location',
    });
    expect(saveButton).toBeDisabled();
  });
});
