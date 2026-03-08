import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminStatsGrid from './AdminStatsGrid';

const baseProps = {
  totalRoutes: 10,
  activeRoutes: 7,
  inactiveRoutes: 3,
  avgStopsPerRoute: 4.25,
  avgDistanceMiles: 12.5,
  routesPerMetro: [
    { metroId: 'm1', metroName: 'Cleveland', count: 6 },
    { metroId: null, metroName: 'Unassigned', count: 4 },
  ],
};

describe('AdminStatsGrid', () => {
  it('renders scalar stats', () => {
    render(<AdminStatsGrid {...baseProps} />);
    expect(screen.getByTestId('stat-total')).toHaveTextContent('10');
    expect(screen.getByTestId('stat-active')).toHaveTextContent('7');
    expect(screen.getByTestId('stat-inactive')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-avg-stops')).toHaveTextContent('4.3'); // toFixed(1)
    expect(screen.getByTestId('stat-avg-distance')).toHaveTextContent(
      '12.5 mi'
    );
  });

  it('renders em-dash when avg distance is zero', () => {
    render(<AdminStatsGrid {...baseProps} avgDistanceMiles={0} />);
    expect(screen.getByTestId('stat-avg-distance')).toHaveTextContent('—');
  });

  it('renders per-metro table', () => {
    render(<AdminStatsGrid {...baseProps} />);
    expect(screen.getByText('Cleveland')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('hides per-metro table when empty', () => {
    render(<AdminStatsGrid {...baseProps} routesPerMetro={[]} />);
    expect(screen.queryByText('Routes per metro')).not.toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    render(<AdminStatsGrid {...baseProps} isLoading />);
    expect(screen.getByLabelText('Loading analytics')).toBeInTheDocument();
    expect(screen.queryByTestId('stat-total')).not.toBeInTheDocument();
  });

  it('shows error alert', () => {
    render(<AdminStatsGrid {...baseProps} error={new Error('nope')} />);
    expect(screen.getByText(/nope/)).toBeInTheDocument();
  });
});
