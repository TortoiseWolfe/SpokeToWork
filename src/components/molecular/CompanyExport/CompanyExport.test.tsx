import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CompanyExport from './CompanyExport';

describe('CompanyExport', () => {
  const mockOnExport = vi.fn();

  beforeEach(() => {
    mockOnExport.mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CompanyExport onExport={mockOnExport} />);
    expect(screen.getByTestId('company-export')).toBeInTheDocument();
  });

  it('renders export format buttons', () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);
    expect(
      screen.getByRole('button', { name: /export as csv/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /export as json/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /export as gpx/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /export as print/i })
    ).toBeInTheDocument();
  });

  it('shows company count', () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);
    expect(
      screen.getByText(/5 companies will be exported/i)
    ).toBeInTheDocument();
  });

  it('shows singular company count', () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={1} />);
    expect(screen.getByText(/1 company will be exported/i)).toBeInTheDocument();
  });

  it('shows no companies message when count is 0', () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={0} />);
    expect(screen.getByText(/no companies to export/i)).toBeInTheDocument();
  });

  it('disables buttons when company count is 0', () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={0} />);
    const csvButton = screen.getByRole('button', { name: /export as csv/i });
    expect(csvButton).toBeDisabled();
  });

  it('disables buttons when disabled prop is true', () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} disabled />);
    const csvButton = screen.getByRole('button', { name: /export as csv/i });
    expect(csvButton).toBeDisabled();
  });

  it('calls onExport with correct format when CSV clicked', async () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);

    fireEvent.click(screen.getByRole('button', { name: /export as csv/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('csv');
    });
  });

  it('calls onExport with correct format when JSON clicked', async () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);

    fireEvent.click(screen.getByRole('button', { name: /export as json/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('json');
    });
  });

  it('calls onExport with correct format when GPX clicked', async () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);

    fireEvent.click(screen.getByRole('button', { name: /export as gpx/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('gpx');
    });
  });

  it('calls onExport with correct format when Print clicked', async () => {
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);

    fireEvent.click(screen.getByRole('button', { name: /export as print/i }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('printable');
    });
  });

  it('shows error when export fails', async () => {
    mockOnExport.mockRejectedValue(new Error('Export failed'));
    render(<CompanyExport onExport={mockOnExport} companyCount={5} />);

    fireEvent.click(screen.getByRole('button', { name: /export as csv/i }));

    await waitFor(() => {
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<CompanyExport onExport={mockOnExport} className="custom-class" />);
    expect(screen.getByTestId('company-export')).toHaveClass('custom-class');
  });
});
