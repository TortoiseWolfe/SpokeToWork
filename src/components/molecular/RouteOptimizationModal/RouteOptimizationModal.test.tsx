import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteOptimizationModal from './RouteOptimizationModal';
import type { RouteOptimizationResult } from '@/lib/routes/optimization-types';

describe('RouteOptimizationModal', () => {
  const mockOnApply = vi.fn();
  const mockOnClose = vi.fn();

  const mockCompanies = [
    { id: 'company-1', name: 'Company A' },
    { id: 'company-2', name: 'Company B' },
    { id: 'company-3', name: 'Company C' },
  ];

  const mockOriginalOrder = ['company-1', 'company-2', 'company-3'];

  const mockResult: RouteOptimizationResult = {
    optimizedOrder: ['company-2', 'company-1', 'company-3'],
    totalDistanceMiles: 8.5,
    originalDistanceMiles: 12.3,
    distanceSavingsMiles: 3.8,
    distanceSavingsPercent: 31,
    estimatedTimeMinutes: 45,
    distancesFromStart: {
      'company-1': 3.2,
      'company-2': 1.5,
      'company-3': 8.5,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <RouteOptimizationModal
        isOpen={false}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Route Optimization')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={null}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        isLoading={true}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText('Calculating optimal route...')
    ).toBeInTheDocument();
  });

  it('shows error state when error is provided', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={null}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        error="Failed to optimize route"
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Failed to optimize route')).toBeInTheDocument();
  });

  it('displays savings when optimization has improvements', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Save 3.8 miles/)).toBeInTheDocument();
    expect(screen.getByText(/31%/)).toBeInTheDocument();
  });

  it('displays no savings message when route is optimal', () => {
    const optimalResult: RouteOptimizationResult = {
      ...mockResult,
      distanceSavingsMiles: 0,
      distanceSavingsPercent: 0,
      originalDistanceMiles: 8.5,
    };

    render(
      <RouteOptimizationModal
        isOpen={true}
        result={optimalResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText(/Route is already optimally ordered/)
    ).toBeInTheDocument();
  });

  it('displays before and after order comparison', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Current Order')).toBeInTheDocument();
    expect(screen.getByText('Optimized Order')).toBeInTheDocument();

    // Check company names appear in both lists
    const companyAElements = screen.getAllByText('Company A');
    expect(companyAElements.length).toBe(2);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking close button', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking backdrop', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onApply when apply button is clicked', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /apply optimization/i })
    );
    expect(mockOnApply).toHaveBeenCalled();
  });

  it('disables apply button when no savings', () => {
    const optimalResult: RouteOptimizationResult = {
      ...mockResult,
      distanceSavingsMiles: 0,
      distanceSavingsPercent: 0,
    };

    render(
      <RouteOptimizationModal
        isOpen={true}
        result={optimalResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByRole('button', { name: /apply optimization/i })
    ).toBeDisabled();
  });

  it('disables buttons during loading', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={null}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        isLoading={true}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /close/i })).toBeDisabled();
  });

  it('displays estimated time and total distance', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('8.5 miles')).toBeInTheDocument();
  });

  it('shows movement indicators for reordered companies', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    // Company B moved from position 2 to position 1 (up arrow)
    const upArrows = screen.getAllByLabelText('Moved');
    expect(upArrows.length).toBeGreaterThan(0);
  });
});
