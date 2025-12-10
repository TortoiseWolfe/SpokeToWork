import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TileLayerSelector from './TileLayerSelector';
import type { MapTileProvider } from '@/types/route';

expect.extend(toHaveNoViolations);

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
];

describe('TileLayerSelector Accessibility', () => {
  it('has no accessibility violations in closed state', async () => {
    const { container } = render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in open state', async () => {
    const { container } = render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[0]}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Select map tile provider/i })
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in loading state', async () => {
    const { container } = render(
      <TileLayerSelector
        providers={[]}
        selected={null}
        onSelect={vi.fn()}
        isLoading={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('button has proper aria attributes', () => {
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
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('button updates aria-expanded when opened', () => {
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

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('listbox has proper role and label', () => {
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

    expect(
      screen.getByRole('listbox', { name: 'Map tile providers' })
    ).toBeInTheDocument();
  });

  it('options have proper roles', () => {
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

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });

  it('selected option has aria-selected', () => {
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

    const otherOption = screen.getByRole('option', { name: /OpenCycleMap/i });
    expect(otherOption).toHaveAttribute('aria-selected', 'false');
  });

  it('disabled options have aria-disabled', () => {
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

    const disabledOption = screen.getByRole('option', {
      name: /OpenCycleMap/i,
    });
    expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('cycling optimized badge has accessible label', () => {
    render(
      <TileLayerSelector
        providers={mockProviders}
        selected={mockProviders[1]} // OpenCycleMap
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Cycling optimized')).toBeInTheDocument();
  });

  it('API key indicator has accessible label', () => {
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

    expect(screen.getByLabelText('Requires API key')).toBeInTheDocument();
  });

  it('loading button is disabled for accessibility', () => {
    render(
      <TileLayerSelector
        providers={[]}
        selected={null}
        onSelect={vi.fn()}
        isLoading={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
