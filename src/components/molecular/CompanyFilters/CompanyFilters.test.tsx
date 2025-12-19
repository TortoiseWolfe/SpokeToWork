import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompanyFilters from './CompanyFilters';

describe('CompanyFilters', () => {
  const defaultProps = {
    filters: {},
    onFiltersChange: vi.fn(),
  };

  it('renders without crashing', () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByTestId('company-filters')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByLabelText('Search companies')).toBeInTheDocument();
  });

  it('renders status select', () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('renders priority select', () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByLabelText('Filter by priority')).toBeInTheDocument();
  });

  it('renders active checkbox', () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(
      screen.getByLabelText('Filter by active status')
    ).toBeInTheDocument();
  });

  it('calls onFiltersChange when search changes', () => {
    const onFiltersChange = vi.fn();
    render(
      <CompanyFilters {...defaultProps} onFiltersChange={onFiltersChange} />
    );

    const searchInput = screen.getByLabelText('Search companies');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(onFiltersChange).toHaveBeenCalledWith({ search: 'test' });
  });

  it('calls onFiltersChange when status changes', () => {
    const onFiltersChange = vi.fn();
    render(
      <CompanyFilters {...defaultProps} onFiltersChange={onFiltersChange} />
    );

    const statusSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(statusSelect, { target: { value: 'contacted' } });

    expect(onFiltersChange).toHaveBeenCalledWith({ status: 'contacted' });
  });

  it('shows clear button when filters are active', () => {
    render(<CompanyFilters {...defaultProps} filters={{ search: 'test' }} />);

    expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument();
  });

  it('does not show clear button when no filters active', () => {
    render(<CompanyFilters {...defaultProps} />);

    expect(
      screen.queryByLabelText('Clear all filters')
    ).not.toBeInTheDocument();
  });

  it('clears all filters when clear button clicked', () => {
    const onFiltersChange = vi.fn();
    render(
      <CompanyFilters
        {...defaultProps}
        filters={{ search: 'test', status: 'contacted' }}
        onFiltersChange={onFiltersChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Clear all filters'));
    expect(onFiltersChange).toHaveBeenCalledWith({});
  });

  it('applies custom className', () => {
    render(<CompanyFilters {...defaultProps} className="custom-class" />);
    expect(screen.getByTestId('company-filters')).toHaveClass('custom-class');
  });

  // Feature 044: On Active Route filter tests
  describe('On Active Route filter', () => {
    it('renders On Active Route checkbox', () => {
      render(<CompanyFilters {...defaultProps} />);
      expect(
        screen.getByLabelText('Show only companies on active route')
      ).toBeInTheDocument();
    });

    it('calls onFiltersChange when On Active Route checkbox changes', () => {
      const onFiltersChange = vi.fn();
      render(
        <CompanyFilters {...defaultProps} onFiltersChange={onFiltersChange} />
      );

      const checkbox = screen.getByLabelText(
        'Show only companies on active route'
      );
      fireEvent.click(checkbox);

      expect(onFiltersChange).toHaveBeenCalledWith({ on_active_route: true });
    });

    it('shows On Active Route as checked when filter is active', () => {
      render(
        <CompanyFilters {...defaultProps} filters={{ on_active_route: true }} />
      );

      const checkbox = screen.getByLabelText(
        'Show only companies on active route'
      );
      expect(checkbox).toBeChecked();
    });

    it('shows clear button when On Active Route filter is active', () => {
      render(
        <CompanyFilters {...defaultProps} filters={{ on_active_route: true }} />
      );

      expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument();
    });
  });
});
