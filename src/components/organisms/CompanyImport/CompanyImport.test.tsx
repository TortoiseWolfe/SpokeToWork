import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompanyImport from './CompanyImport';
import type { ImportResult } from '@/types/company';

const mockSuccessResult: ImportResult = {
  success: 5,
  failed: 0,
  errors: [],
};

const mockPartialResult: ImportResult = {
  success: 3,
  failed: 2,
  errors: [
    { row: 2, reason: 'Missing company name' },
    { row: 5, reason: 'Geocoding failed' },
  ],
};

describe('CompanyImport', () => {
  it('renders without crashing', () => {
    const onImport = vi.fn();
    render(<CompanyImport onImport={onImport} />);
    expect(screen.getByTestId('company-import')).toBeInTheDocument();
  });

  it('displays CSV format instructions', () => {
    const onImport = vi.fn();
    render(<CompanyImport onImport={onImport} />);
    expect(screen.getByText(/Expected CSV columns/i)).toBeInTheDocument();
  });

  it('has a file select button', () => {
    const onImport = vi.fn();
    render(<CompanyImport onImport={onImport} />);
    expect(
      screen.getByRole('button', { name: /select file/i })
    ).toBeInTheDocument();
  });

  it('shows cancel button when onCancel provided', () => {
    const onImport = vi.fn();
    const onCancel = vi.fn();
    render(<CompanyImport onImport={onImport} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel clicked', () => {
    const onImport = vi.fn();
    const onCancel = vi.fn();
    render(<CompanyImport onImport={onImport} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onImport with file when valid CSV selected', async () => {
    const onImport = vi.fn().mockResolvedValue(mockSuccessResult);
    render(<CompanyImport onImport={onImport} />);

    const file = new File(['name,address\nTest,123 Main St'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByLabelText('Select CSV file');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(file);
    });
  });

  it('shows success message after import', async () => {
    const onImport = vi.fn().mockResolvedValue(mockSuccessResult);
    render(<CompanyImport onImport={onImport} />);

    const file = new File(['name,address\nTest,123 Main St'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByLabelText('Select CSV file');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/5 succeeded/i)).toBeInTheDocument();
    });
  });

  it('shows errors when import has failures', async () => {
    const onImport = vi.fn().mockResolvedValue(mockPartialResult);
    render(<CompanyImport onImport={onImport} />);

    const file = new File(['name,address\nTest,123 Main St'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByLabelText('Select CSV file');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/3 succeeded, 2 failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing company name/i)).toBeInTheDocument();
    });
  });

  it('shows error when non-CSV file selected', async () => {
    const onImport = vi.fn();
    render(<CompanyImport onImport={onImport} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select CSV file');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Please select a CSV file/i)).toBeInTheDocument();
    });
    expect(onImport).not.toHaveBeenCalled();
  });

  it('calls onComplete after successful import', async () => {
    const onImport = vi.fn().mockResolvedValue(mockSuccessResult);
    const onComplete = vi.fn();
    render(<CompanyImport onImport={onImport} onComplete={onComplete} />);

    const file = new File(['name,address\nTest,123 Main St'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByLabelText('Select CSV file');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(mockSuccessResult);
    });
  });

  it('applies custom className', () => {
    const onImport = vi.fn();
    render(<CompanyImport onImport={onImport} className="custom-class" />);
    expect(screen.getByTestId('company-import')).toHaveClass('custom-class');
  });
});
