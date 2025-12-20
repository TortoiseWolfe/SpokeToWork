import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import RouteOptimizationModal from './RouteOptimizationModal';
import type { RouteOptimizationResult } from '@/lib/routes/optimization-types';

expect.extend(toHaveNoViolations);

describe('RouteOptimizationModal Accessibility', () => {
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

  it('should not have any accessibility violations with results', async () => {
    const { container } = render(
      <RouteOptimizationModal
        isOpen={true}
        result={mockResult}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have any accessibility violations in loading state', async () => {
    const { container } = render(
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

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have any accessibility violations in error state', async () => {
    const { container } = render(
      <RouteOptimizationModal
        isOpen={true}
        result={null}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        error="Something went wrong"
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has dialog role with aria-modal', () => {
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

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has accessible title with aria-labelledby', () => {
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

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute(
      'aria-labelledby',
      'optimization-modal-title'
    );

    const title = screen.getByText('Route Optimization');
    expect(title).toHaveAttribute('id', 'optimization-modal-title');
  });

  it('has accessible close button', () => {
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

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('has accessible cancel and apply buttons', () => {
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

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /apply optimization/i })
    ).toBeInTheDocument();
  });

  it('has labeled lists for route orders', () => {
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

    expect(
      screen.getByRole('list', { name: /current route order/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: /optimized route order/i })
    ).toBeInTheDocument();
  });

  it('has role="status" for loading indicator', () => {
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

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('has role="alert" for error message', () => {
    render(
      <RouteOptimizationModal
        isOpen={true}
        result={null}
        companies={mockCompanies}
        originalOrder={mockOriginalOrder}
        error="An error occurred"
        onApply={mockOnApply}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has movement indicators with aria-label', () => {
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

    const movedIndicators = screen.getAllByLabelText('Moved');
    expect(movedIndicators.length).toBeGreaterThan(0);
  });
});
