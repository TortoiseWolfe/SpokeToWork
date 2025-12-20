import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteStartEndEditor from './RouteStartEndEditor';

const mockHomeLocation = {
  address: '123 Home St, Cleveland, TN',
  latitude: 35.1667,
  longitude: -84.8667,
};

describe('RouteStartEndEditor', () => {
  it('renders without crashing', () => {
    render(<RouteStartEndEditor />);
    expect(
      screen.getByText('Round Trip (end at start location)')
    ).toBeInTheDocument();
  });

  it('shows warning when no home location is set', () => {
    render(<RouteStartEndEditor homeLocation={null} />);
    expect(screen.getByText(/No home address set/)).toBeInTheDocument();
  });

  it('does not show warning when home location is set', () => {
    render(<RouteStartEndEditor homeLocation={mockHomeLocation} />);
    expect(screen.queryByText(/No home address set/)).not.toBeInTheDocument();
  });

  it('displays home location when type is home', () => {
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
    const addressElements = screen.getAllByText('123 Home St, Cleveland, TN');
    expect(addressElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows input fields when type is custom', () => {
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

  it('hides end point fields when round trip is enabled', () => {
    render(
      <RouteStartEndEditor homeLocation={mockHomeLocation} isRoundTrip={true} />
    );
    expect(screen.queryByLabelText('End address')).not.toBeInTheDocument();
  });

  it('shows end point fields when round trip is disabled', () => {
    render(
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
    expect(screen.getByLabelText('End address')).toBeInTheDocument();
  });

  it('calls onRoundTripChange when toggling round trip', async () => {
    const user = userEvent.setup();
    const onRoundTripChange = vi.fn();

    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        isRoundTrip={true}
        onRoundTripChange={onRoundTripChange}
      />
    );

    await user.click(screen.getByLabelText('Round trip route'));
    expect(onRoundTripChange).toHaveBeenCalledWith(false);
  });

  it('calls onStartChange when switching to custom type', async () => {
    const user = userEvent.setup();
    const onStartChange = vi.fn();

    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        startPoint={{
          type: 'home',
          address: null,
          latitude: null,
          longitude: null,
        }}
        onStartChange={onStartChange}
      />
    );

    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(onStartChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'custom' })
    );
  });

  it('disables home button when no home location', () => {
    render(<RouteStartEndEditor homeLocation={null} />);
    const homeButtons = screen.getAllByRole('radio', { name: 'Home' });
    homeButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('displays summary with correct route type', () => {
    render(
      <RouteStartEndEditor homeLocation={mockHomeLocation} isRoundTrip={true} />
    );
    expect(screen.getByText('Round Trip')).toBeInTheDocument();
  });

  it('displays summary with one-way when not round trip', () => {
    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        isRoundTrip={false}
      />
    );
    expect(screen.getByText('One-Way')).toBeInTheDocument();
  });

  it('syncs end with start when enabling round trip', async () => {
    const user = userEvent.setup();
    const onEndChange = vi.fn();

    render(
      <RouteStartEndEditor
        homeLocation={mockHomeLocation}
        isRoundTrip={false}
        startPoint={{
          type: 'home',
          address: mockHomeLocation.address,
          latitude: mockHomeLocation.latitude,
          longitude: mockHomeLocation.longitude,
        }}
        endPoint={{
          type: 'custom',
          address: 'Different',
          latitude: 35.0,
          longitude: -85.0,
        }}
        onEndChange={onEndChange}
      />
    );

    await user.click(screen.getByLabelText('Round trip route'));
    expect(onEndChange).toHaveBeenCalled();
  });

  it('disables all inputs when disabled prop is true', () => {
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
  });
});
