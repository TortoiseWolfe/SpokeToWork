import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompanyRow from './CompanyRow';
import type { Company } from '@/types/company';

const mockCompany: Company = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Test Corp',
  contact_name: 'John Doe',
  contact_title: 'Manager',
  phone: '555-1234',
  email: 'john@test.com',
  website: 'https://test.com',
  careers_url: null,
  address: '123 Test St, New York, NY',
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

const renderInTable = (ui: React.ReactElement) => {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  );
};

describe('CompanyRow', () => {
  it('renders company name', () => {
    renderInTable(<CompanyRow company={mockCompany} />);
    expect(screen.getByText('Test Corp')).toBeInTheDocument();
  });

  it('renders company address', () => {
    renderInTable(<CompanyRow company={mockCompany} />);
    expect(screen.getByText('123 Test St, New York, NY')).toBeInTheDocument();
  });

  it('renders contact name when provided', () => {
    renderInTable(<CompanyRow company={mockCompany} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderInTable(<CompanyRow company={mockCompany} />);
    expect(screen.getByText('Not Contacted')).toBeInTheDocument();
  });

  it('renders priority indicator for high priority', () => {
    renderInTable(<CompanyRow company={{ ...mockCompany, priority: 1 }} />);
    expect(screen.getByTitle('Priority 1')).toBeInTheDocument();
  });

  it('shows extended range badge when applicable', () => {
    renderInTable(
      <CompanyRow company={{ ...mockCompany, extended_range: true }} />
    );
    expect(screen.getByTitle('Extended range')).toBeInTheDocument();
  });

  it('shows inactive badge when company is inactive', () => {
    renderInTable(
      <CompanyRow company={{ ...mockCompany, is_active: false }} />
    );
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls onClick when row is clicked', () => {
    const onClick = vi.fn();
    renderInTable(<CompanyRow company={mockCompany} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('company-row'));
    expect(onClick).toHaveBeenCalledWith(mockCompany);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    const onClick = vi.fn();
    renderInTable(
      <CompanyRow company={mockCompany} onEdit={onEdit} onClick={onClick} />
    );

    fireEvent.click(screen.getByLabelText('Edit Test Corp'));
    expect(onEdit).toHaveBeenCalledWith(mockCompany);
    expect(onClick).not.toHaveBeenCalled(); // Should not propagate
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    const onClick = vi.fn();
    renderInTable(
      <CompanyRow company={mockCompany} onDelete={onDelete} onClick={onClick} />
    );

    fireEvent.click(screen.getByLabelText('Delete Test Corp'));
    expect(onDelete).toHaveBeenCalledWith(mockCompany);
    expect(onClick).not.toHaveBeenCalled(); // Should not propagate
  });

  it('renders status dropdown when onStatusChange provided', () => {
    renderInTable(
      <CompanyRow company={mockCompany} onStatusChange={vi.fn()} />
    );
    expect(screen.getByLabelText('Change status')).toBeInTheDocument();
  });

  it('calls onStatusChange when status is changed', () => {
    const onStatusChange = vi.fn();
    renderInTable(
      <CompanyRow company={mockCompany} onStatusChange={onStatusChange} />
    );

    const select = screen.getByLabelText('Change status');
    fireEvent.change(select, { target: { value: 'contacted' } });

    expect(onStatusChange).toHaveBeenCalledWith(mockCompany, 'contacted');
  });

  it('does not render edit button when onEdit not provided', () => {
    renderInTable(<CompanyRow company={mockCompany} />);
    expect(screen.queryByLabelText('Edit Test Corp')).not.toBeInTheDocument();
  });

  it('does not render delete button when onDelete not provided', () => {
    renderInTable(<CompanyRow company={mockCompany} />);
    expect(screen.queryByLabelText('Delete Test Corp')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderInTable(
      <CompanyRow company={mockCompany} className="custom-class" />
    );
    expect(screen.getByTestId('company-row')).toHaveClass('custom-class');
  });

  it('applies opacity when company is inactive', () => {
    renderInTable(
      <CompanyRow company={{ ...mockCompany, is_active: false }} />
    );
    expect(screen.getByTestId('company-row')).toHaveClass('opacity-60');
  });
});
