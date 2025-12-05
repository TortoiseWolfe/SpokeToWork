import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyDetailDrawer from './CompanyDetailDrawer';
import type { CompanyWithApplications } from '@/types/company';

const mockCompany: CompanyWithApplications = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Acme Corporation',
  address: '123 Main St, Cleveland, OH',
  latitude: 41.4993,
  longitude: -81.6944,
  website: 'https://acme.example.com',
  email: 'hr@acme.example.com',
  phone: '555-123-4567',
  contact_name: 'John Smith',
  contact_title: 'HR Manager',
  notes: 'Great company culture',
  status: 'contacted',
  priority: 2,
  follow_up_date: null,
  is_active: true,
  extended_range: false,
  route_id: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-10T00:00:00.000Z',
  applications: [
    {
      id: 'app-1',
      company_id: 'company-123',
      user_id: 'user-456',
      position_title: 'Senior Engineer',
      job_link: 'https://jobs.acme.com/123',
      work_location_type: 'hybrid',
      status: 'interviewing',
      outcome: 'pending',
      date_applied: '2024-01-15',
      interview_date: '2024-01-25T10:00:00.000Z',
      follow_up_date: null,
      priority: 1,
      notes: 'Second round scheduled',
      is_active: true,
      created_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-20T00:00:00.000Z',
    },
    {
      id: 'app-2',
      company_id: 'company-123',
      user_id: 'user-456',
      position_title: 'Tech Lead',
      job_link: null,
      work_location_type: 'remote',
      status: 'applied',
      outcome: 'pending',
      date_applied: '2024-01-20',
      interview_date: null,
      follow_up_date: null,
      priority: 3,
      notes: null,
      is_active: true,
      created_at: '2024-01-18T00:00:00.000Z',
      updated_at: '2024-01-20T00:00:00.000Z',
    },
  ],
  latest_application: {
    id: 'app-1',
    company_id: 'company-123',
    user_id: 'user-456',
    position_title: 'Senior Engineer',
    job_link: 'https://jobs.acme.com/123',
    work_location_type: 'hybrid',
    status: 'interviewing',
    outcome: 'pending',
    date_applied: '2024-01-15',
    interview_date: '2024-01-25T10:00:00.000Z',
    follow_up_date: null,
    priority: 1,
    notes: 'Second round scheduled',
    is_active: true,
    created_at: '2024-01-10T00:00:00.000Z',
    updated_at: '2024-01-20T00:00:00.000Z',
  },
  total_applications: 2,
};

describe('CompanyDetailDrawer', () => {
  const mockOnClose = vi.fn();
  const mockOnEditCompany = vi.fn();
  const mockOnAddApplication = vi.fn();
  const mockOnEditApplication = vi.fn();
  const mockOnDeleteApplication = vi.fn();
  const mockOnStatusChange = vi.fn();
  const mockOnOutcomeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders company details when open', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Cleveland, OH')).toBeInTheDocument();
    expect(screen.getByText(/John Smith/)).toBeInTheDocument();
    expect(screen.getByText('Applications (2)')).toBeInTheDocument();
  });

  it('renders nothing when company is null', () => {
    const { container } = render(
      <CompanyDetailDrawer company={null} isOpen={true} onClose={mockOnClose} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows applications list', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();

    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByLabelText('Close drawer'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onEditCompany when edit button clicked', async () => {
    const user = userEvent.setup();

    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
        onEditCompany={mockOnEditCompany}
      />
    );

    await user.click(screen.getByLabelText('Edit company'));
    expect(mockOnEditCompany).toHaveBeenCalledWith(mockCompany);
  });

  it('calls onAddApplication when add button clicked', async () => {
    const user = userEvent.setup();

    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
        onAddApplication={mockOnAddApplication}
      />
    );

    await user.click(screen.getByLabelText('Add application'));
    expect(mockOnAddApplication).toHaveBeenCalledWith(mockCompany);
  });

  it('calls onEditApplication when application edit clicked', async () => {
    const user = userEvent.setup();

    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
        onEditApplication={mockOnEditApplication}
      />
    );

    await user.click(screen.getByLabelText('Edit Senior Engineer'));
    expect(mockOnEditApplication).toHaveBeenCalledWith(
      mockCompany.applications[0]
    );
  });

  it('calls onDeleteApplication when application delete clicked', async () => {
    const user = userEvent.setup();

    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
        onDeleteApplication={mockOnDeleteApplication}
      />
    );

    await user.click(screen.getByLabelText('Delete Senior Engineer'));
    expect(mockOnDeleteApplication).toHaveBeenCalledWith(
      mockCompany.applications[0]
    );
  });

  it('shows status dropdown when onStatusChange provided', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getAllByLabelText('Change status')).toHaveLength(2);
  });

  it('calls onStatusChange when status changed', async () => {
    const user = userEvent.setup();

    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    const statusSelects = screen.getAllByLabelText('Change status');
    await user.selectOptions(statusSelects[0], 'offer');
    expect(mockOnStatusChange).toHaveBeenCalledWith(
      mockCompany.applications[0],
      'offer'
    );
  });

  it('shows company notes', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Great company culture')).toBeInTheDocument();
  });

  it('shows empty state when no applications', () => {
    const companyNoApps = {
      ...mockCompany,
      applications: [],
      latest_application: null,
      total_applications: 0,
    };

    render(
      <CompanyDetailDrawer
        company={companyNoApps}
        isOpen={true}
        onClose={mockOnClose}
        onAddApplication={mockOnAddApplication}
      />
    );

    expect(screen.getByText('No applications yet.')).toBeInTheDocument();
    expect(screen.getByText('Add your first application')).toBeInTheDocument();
  });

  it('applies transform class based on isOpen', () => {
    const { rerender } = render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('company-detail-drawer')).toHaveClass(
      'translate-x-0'
    );

    rerender(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('company-detail-drawer')).toHaveClass(
      'translate-x-full'
    );
  });

  it('shows priority indicator for high priority applications', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Priority 1 should show '!!'
    expect(screen.getByText('!!')).toBeInTheDocument();
  });

  it('shows View Job link for applications with job_link', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const viewJobLinks = screen.getAllByText('View Job');
    expect(viewJobLinks).toHaveLength(1);
    expect(viewJobLinks[0]).toHaveAttribute(
      'href',
      'https://jobs.acme.com/123'
    );
  });
});
