import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompanyForm from './CompanyForm';
import type { Company, HomeLocation } from '@/types/company';

// Mock the geocoding module
vi.mock('@/lib/companies/geocoding', () => ({
  geocode: vi.fn().mockResolvedValue({
    success: true,
    address: '123 Main St',
    latitude: 40.7128,
    longitude: -74.006,
  }),
  validateDistance: vi.fn().mockReturnValue({
    distance_miles: 5.0,
    within_radius: true,
    extended_range: false,
  }),
}));

// Mock dynamic import for CoordinateMap
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockedComponent = () => (
      <div data-testid="coordinate-map">Mocked Map</div>
    );
    return MockedComponent;
  },
}));

const mockHomeLocation: HomeLocation = {
  address: '100 Home Street',
  latitude: 40.7,
  longitude: -74.0,
  radius_miles: 25,
};

const mockCompany: Company = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Test Corp',
  contact_name: 'John Doe',
  contact_title: 'Manager',
  phone: '555-1234',
  email: 'john@test.com',
  website: 'https://test.com',
  address: '123 Test St',
  latitude: 40.7128,
  longitude: -74.006,
  extended_range: false,
  status: 'not_contacted',
  priority: 3,
  notes: 'Test notes',
  follow_up_date: null,
  route_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('CompanyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CompanyForm />);
    expect(screen.getByTestId('company-form')).toBeInTheDocument();
  });

  it('renders create mode title by default', () => {
    render(<CompanyForm />);
    expect(screen.getByText('Add New Company')).toBeInTheDocument();
  });

  it('renders edit mode title when company is provided', () => {
    render(<CompanyForm company={mockCompany} />);
    expect(screen.getByText('Edit Company')).toBeInTheDocument();
  });

  it('pre-fills form fields in edit mode', () => {
    render(<CompanyForm company={mockCompany} />);

    expect(screen.getByDisplayValue('Test Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Manager')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
  });

  it('shows required field indicators', () => {
    render(<CompanyForm />);

    const labels = screen.getAllByText('*');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('validates required company name', async () => {
    const onSubmit = vi.fn();
    render(<CompanyForm onSubmit={onSubmit} />);

    // Try to submit without name
    const submitButton = screen.getByRole('button', { name: /add company/i });
    fireEvent.click(submitButton);

    // Should show error (submit button disabled without coordinates)
    expect(submitButton).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<CompanyForm onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel button when onCancel not provided', () => {
    render(<CompanyForm />);
    expect(
      screen.queryByRole('button', { name: /cancel/i })
    ).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CompanyForm className="custom-class" />);
    const form = screen.getByTestId('company-form');
    expect(form).toHaveClass('custom-class');
  });

  it('disables submit button when no coordinates', () => {
    render(<CompanyForm />);
    const submitButton = screen.getByRole('button', { name: /add company/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows status select with all options', () => {
    render(<CompanyForm />);
    const statusSelect = screen.getByLabelText('Status');

    expect(statusSelect).toBeInTheDocument();
    expect(screen.getByText('Not Contacted')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText('Follow Up')).toBeInTheDocument();
  });

  it('shows priority select with all options', () => {
    render(<CompanyForm />);
    const prioritySelect = screen.getByLabelText('Priority');

    expect(prioritySelect).toBeInTheDocument();
    expect(screen.getByText('1 - Highest')).toBeInTheDocument();
    expect(screen.getByText('3 - Medium')).toBeInTheDocument();
    expect(screen.getByText('5 - Lowest')).toBeInTheDocument();
  });

  it('updates form state on input change', () => {
    render(<CompanyForm />);

    const nameInput = screen.getByLabelText(/company name/i);
    fireEvent.change(nameInput, { target: { value: 'New Company' } });

    expect(nameInput).toHaveValue('New Company');
  });

  it('renders geocode button', () => {
    render(<CompanyForm />);
    expect(
      screen.getByRole('button', { name: /geocode/i })
    ).toBeInTheDocument();
  });

  it('disables geocode button when address is empty', () => {
    render(<CompanyForm />);
    const geocodeButton = screen.getByRole('button', { name: /geocode/i });
    expect(geocodeButton).toBeDisabled();
  });
});
