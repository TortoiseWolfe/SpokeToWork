import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompanyTable from './CompanyTable';
import type { Company } from '@/types/company';

const mockCompanies: Company[] = [
  {
    id: 'company-1',
    user_id: 'user-1',
    name: 'Acme Corp',
    contact_name: 'John Doe',
    contact_title: 'Manager',
    phone: '555-1234',
    email: 'john@acme.com',
    website: 'https://acme.com',
    address: '123 Main St, New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    extended_range: false,
    status: 'contacted',
    priority: 2,
    notes: null,
    follow_up_date: null,
    route_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'company-2',
    user_id: 'user-1',
    name: 'Beta Inc',
    contact_name: 'Jane Smith',
    contact_title: 'HR',
    phone: '555-5678',
    email: 'jane@beta.com',
    website: 'https://beta.com',
    address: '456 Oak Ave, Boston, MA',
    latitude: 42.3601,
    longitude: -71.0589,
    extended_range: true,
    status: 'not_contacted',
    priority: 1,
    notes: null,
    follow_up_date: null,
    route_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('CompanyTable', () => {
  it('renders without crashing', () => {
    render(<CompanyTable companies={mockCompanies} />);
    expect(screen.getByTestId('company-table')).toBeInTheDocument();
  });

  it('renders company names', () => {
    render(<CompanyTable companies={mockCompanies} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
  });

  it('renders company count', () => {
    render(<CompanyTable companies={mockCompanies} />);
    expect(screen.getByText('2 companies')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CompanyTable companies={[]} isLoading={true} />);
    expect(screen.getByTestId('company-table')).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('shows empty state when no companies', () => {
    render(<CompanyTable companies={[]} />);
    expect(screen.getByText(/No companies yet/)).toBeInTheDocument();
  });

  it('filters companies by search', () => {
    render(<CompanyTable companies={mockCompanies} />);

    const searchInput = screen.getByLabelText('Search companies');
    fireEvent.change(searchInput, { target: { value: 'Acme' } });

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 companies')).toBeInTheDocument();
  });

  it('filters companies by status', () => {
    render(<CompanyTable companies={mockCompanies} />);

    const statusSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(statusSelect, { target: { value: 'contacted' } });

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
  });

  it('sorts companies by name', () => {
    render(<CompanyTable companies={mockCompanies} />);

    // Initially sorted A-Z
    const rows = screen.getAllByTestId(/company-row/);
    expect(rows[0]).toHaveTextContent('Acme Corp');

    // Click to sort Z-A
    fireEvent.click(screen.getByText('Company'));
    const rowsAfter = screen.getAllByTestId(/company-row/);
    expect(rowsAfter[0]).toHaveTextContent('Beta Inc');
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<CompanyTable companies={mockCompanies} onEdit={onEdit} />);

    fireEvent.click(screen.getByLabelText('Edit Acme Corp'));
    expect(onEdit).toHaveBeenCalledWith(mockCompanies[0]);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<CompanyTable companies={mockCompanies} onDelete={onDelete} />);

    fireEvent.click(screen.getByLabelText('Delete Acme Corp'));
    expect(onDelete).toHaveBeenCalledWith(mockCompanies[0]);
  });

  it('calls onCompanyClick when row clicked', () => {
    const onCompanyClick = vi.fn();
    render(
      <CompanyTable companies={mockCompanies} onCompanyClick={onCompanyClick} />
    );

    fireEvent.click(screen.getByTestId('company-row-company-1'));
    expect(onCompanyClick).toHaveBeenCalledWith(mockCompanies[0]);
  });

  it('applies custom className', () => {
    render(<CompanyTable companies={mockCompanies} className="custom-class" />);
    expect(screen.getByTestId('company-table')).toHaveClass('custom-class');
  });
});
