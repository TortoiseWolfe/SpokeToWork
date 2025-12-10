import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TileLayerSelector from './TileLayerSelector';
import type { MapTileProvider } from '@/types/route';

const mockProviders: MapTileProvider[] = [
  {
    id: '1',
    name: 'osm',
    display_name: 'OpenStreetMap',
    url_template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    max_zoom: 19,
    is_cycling_optimized: false,
    requires_api_key: false,
    is_enabled: true,
    priority: 1,
  },
  {
    id: '2',
    name: 'opencyclemap',
    display_name: 'OpenCycleMap',
    url_template:
      'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}',
    attribution: '© Thunderforest',
    max_zoom: 22,
    is_cycling_optimized: true,
    requires_api_key: true,
    is_enabled: true,
    priority: 2,
  },
  {
    id: '3',
    name: 'outdoors',
    display_name: 'Thunderforest Outdoors',
    url_template:
      'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}',
    attribution: '© Thunderforest',
    max_zoom: 22,
    is_cycling_optimized: true,
    requires_api_key: true,
    is_enabled: true,
    priority: 3,
  },
  {
    id: '4',
    name: 'disabled-provider',
    display_name: 'Disabled Provider',
    url_template: 'https://example.com/{z}/{x}/{y}.png',
    attribution: '© Example',
    max_zoom: 18,
    is_cycling_optimized: false,
    requires_api_key: false,
    is_enabled: false,
    priority: 99,
  },
];

describe('TileLayerSelector', () => {
  it('renders with selected provider', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
  });

  it('shows Map Style when no provider selected', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Map Style')).toBeInTheDocument();
  });

  it('opens dropdown when button clicked', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    const button = screen.getByRole('button', {
      name: /Select map tile provider/i,
    });
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3); // Only enabled providers
  });

  it('does not show disabled providers', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );

    expect(screen.queryByText('Disabled Provider')).not.toBeInTheDocument();
  });

  it('calls onSelect when provider is clicked', () => {
    const onSelect = vi.fn();

    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={onSelect}
        hasApiKey={true} // Provider requires API key to be available
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );
    fireEvent.click(screen.getByRole('option', { name: /OpenCycleMap/i }));

    expect(onSelect).toHaveBeenCalledWith('opencyclemap');
  });

  it('shows cycling optimized badge for cycling providers', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[1]} // OpenCycleMap
        onSelect={vi.fn()}
      />
    );

    // Badge should show on the button
    expect(screen.getByLabelText('Cycling optimized')).toBeInTheDocument();
  });

  it('shows API key indicator for providers requiring API key', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
        hasApiKey={false}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );

    // Should show key indicator on OpenCycleMap and Outdoors
    expect(screen.getAllByLabelText('Requires API key')).toHaveLength(2);
  });

  it('hides API key indicator when user has API key', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
        hasApiKey={true}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );

    expect(screen.queryByLabelText('Requires API key')).not.toBeInTheDocument();
  });

  it('disables providers that are not available', () => {
    const isProviderAvailable = vi.fn((name) => name === 'osm');

    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
        isProviderAvailable={isProviderAvailable}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );

    const openCycleMapOption = screen.getByRole('option', {
      name: /OpenCycleMap/i,
    });
    expect(openCycleMapOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows loading state', () => {
    render(
      <TileLayerSelector
        providers={[]}
        selected={null}
        onSelect={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows reset option when provider is selected', () => {
    const onReset = vi.fn();

    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[1]}
        onSelect={vi.fn()}
        onReset={onReset}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );
    fireEvent.click(screen.getByText('Reset to default'));

    expect(onReset).toHaveBeenCalled();
  });

  it('closes dropdown when selecting a provider', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /OpenStreetMap/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows checkmark on selected provider', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );

    const selectedOption = screen.getByRole('option', {
      name: /OpenStreetMap/i,
    });
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');
  });
});
