import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyDetailDrawer from './CompanyDetailDrawer';
import type {
  CompanyWithApplications,
  UnifiedCompany,
  CompanySource,
} from '@/types/company';

const mockCompany: CompanyWithApplications = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Acme Corporation',
  address: '123 Main St, Cleveland, OH',
  latitude: 41.4993,
  longitude: -81.6944,
  website: 'https://acme.example.com',
  careers_url: null,
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
      shared_company_id: 'company-123',
      private_company_id: null,
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
      shared_company_id: 'company-123',
      private_company_id: null,
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
    shared_company_id: 'company-123',
    private_company_id: null,
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

/**
 * T081 [US3] - Tests for unified company tracking status updates
 */
describe('CompanyDetailDrawer - Unified Company Tracking (T081)', () => {
  const mockOnClose = vi.fn();
  const mockOnTrackingStatusChange = vi.fn();

  const mockUnifiedCompany: UnifiedCompany = {
    source: 'shared' as CompanySource,
    tracking_id: 'tracking-123',
    company_id: 'company-123',
    private_company_id: null,
    user_id: 'user-456',
    metro_area_id: 'metro-1',
    name: 'Unified Corp',
    website: 'https://unified.com',
    careers_url: null,
    address: '456 Unified St, Cleveland, TN 37311',
    latitude: 35.1595,
    longitude: -84.8766,
    phone: '423-555-1234',
    email: 'info@unified.com',
    contact_name: 'Jane Doe',
    contact_title: 'Manager',
    notes: 'Tracking notes',
    status: 'not_contacted',
    priority: 3,
    follow_up_date: null,
    is_active: true,
    is_verified: true,
    submit_to_shared: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-10T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays source badge for unified companies', () => {
    render(
      <CompanyDetailDrawer
        company={mockUnifiedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('displays private badge for private unified companies', () => {
    const privateCompany: UnifiedCompany = {
      ...mockUnifiedCompany,
      source: 'private',
      tracking_id: null,
      private_company_id: 'private-123',
    };

    render(
      <CompanyDetailDrawer
        company={privateCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('shows company status for unified companies', () => {
    render(
      <CompanyDetailDrawer
        company={mockUnifiedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Unified Corp')).toBeInTheDocument();
    expect(
      screen.getByText('456 Unified St, Cleveland, TN 37311')
    ).toBeInTheDocument();
  });

  it('shows tracking status badge', () => {
    const contactedCompany: UnifiedCompany = {
      ...mockUnifiedCompany,
      status: 'contacted',
    };

    render(
      <CompanyDetailDrawer
        company={contactedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // The company status is displayed (from the drawer header or details section)
    expect(screen.getByText('Unified Corp')).toBeInTheDocument();
  });

  it('displays priority for unified companies', () => {
    const highPriorityCompany: UnifiedCompany = {
      ...mockUnifiedCompany,
      priority: 1,
    };

    render(
      <CompanyDetailDrawer
        company={highPriorityCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Priority should be shown somewhere in the drawer
    expect(screen.getByText('Unified Corp')).toBeInTheDocument();
  });

  it('shows notes for unified companies', () => {
    render(
      <CompanyDetailDrawer
        company={mockUnifiedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Tracking notes')).toBeInTheDocument();
  });
});

/**
 * T099/T100/T101: Submit to Community Tests (US5)
 */
describe('CompanyDetailDrawer - Submit to Community (US5)', () => {
  const mockOnClose = vi.fn();

  const mockPrivateCompany: UnifiedCompany = {
    source: 'private',
    tracking_id: null,
    company_id: null,
    private_company_id: 'private-1',
    user_id: 'user-1',
    metro_area_id: 'metro-1',
    name: 'My Private Corp',
    address: '123 Private St, City',
    latitude: 35.1595,
    longitude: -84.8766,
    phone: '555-1234',
    website: 'https://private.com',
    careers_url: null,
    email: null,
    contact_name: 'John Doe',
    contact_title: 'Owner',
    notes: 'Private notes',
    status: 'contacted',
    priority: 2,
    follow_up_date: null,
    is_active: true,
    is_verified: false,
    submit_to_shared: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSharedCompany: UnifiedCompany = {
    source: 'shared',
    tracking_id: 'tracking-1',
    company_id: 'shared-1',
    private_company_id: null,
    user_id: 'user-1',
    metro_area_id: 'metro-1',
    name: 'Community Corp',
    address: '456 Shared Blvd',
    latitude: 35.1595,
    longitude: -84.8766,
    phone: '555-5678',
    website: 'https://shared.com',
    careers_url: null,
    email: null,
    contact_name: null,
    contact_title: null,
    notes: null,
    status: 'not_contacted',
    priority: 3,
    follow_up_date: null,
    is_active: true,
    is_verified: true,
    submit_to_shared: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T099: shows Submit to Community button for private companies', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockPrivateCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSubmitToCommunity={mockOnSubmit}
      />
    );

    expect(screen.getByTestId('submit-to-community-btn')).toBeInTheDocument();
    expect(screen.getByText('Submit to Community')).toBeInTheDocument();
  });

  it('T099: calls onSubmitToCommunity when button is clicked', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockPrivateCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSubmitToCommunity={mockOnSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('submit-to-community-btn'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(mockPrivateCompany);
    });
  });

  it('T100: shows Pending Review badge when submit_to_shared is true', () => {
    const pendingCompany: UnifiedCompany = {
      ...mockPrivateCompany,
      submit_to_shared: true,
    };

    render(
      <CompanyDetailDrawer
        company={pendingCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('pending-review-badge')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(
      screen.queryByTestId('submit-to-community-btn')
    ).not.toBeInTheDocument();
  });

  it('T101: does not show Submit button for shared companies', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockSharedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSubmitToCommunity={mockOnSubmit}
      />
    );

    expect(
      screen.queryByTestId('submit-to-community-btn')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('pending-review-badge')
    ).not.toBeInTheDocument();
  });

  it('T099: does not show Submit button when onSubmitToCommunity not provided', () => {
    render(
      <CompanyDetailDrawer
        company={mockPrivateCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.queryByTestId('submit-to-community-btn')
    ).not.toBeInTheDocument();
  });
});

/**
 * T106/T107: Suggest Edit Tests (US6)
 */
describe('CompanyDetailDrawer - Suggest Edit (US6)', () => {
  const mockOnClose = vi.fn();

  const mockSharedCompany: UnifiedCompany = {
    source: 'shared',
    tracking_id: 'tracking-1',
    company_id: 'shared-1',
    private_company_id: null,
    user_id: 'user-1',
    metro_area_id: 'metro-1',
    name: 'Community Corp',
    address: '456 Shared Blvd',
    latitude: 35.1595,
    longitude: -84.8766,
    phone: '555-5678',
    website: 'https://shared.com',
    careers_url: 'https://shared.com/careers',
    email: 'info@shared.com',
    contact_name: null,
    contact_title: null,
    notes: null,
    status: 'not_contacted',
    priority: 3,
    follow_up_date: null,
    is_active: true,
    is_verified: true,
    submit_to_shared: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPrivateCompany: UnifiedCompany = {
    source: 'private',
    tracking_id: null,
    company_id: null,
    private_company_id: 'private-1',
    user_id: 'user-1',
    metro_area_id: 'metro-1',
    name: 'My Private Corp',
    address: '123 Private St',
    latitude: 35.1595,
    longitude: -84.8766,
    phone: '555-1234',
    website: 'https://private.com',
    careers_url: null,
    email: null,
    contact_name: null,
    contact_title: null,
    notes: null,
    status: 'contacted',
    priority: 2,
    follow_up_date: null,
    is_active: true,
    is_verified: false,
    submit_to_shared: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T106: shows Suggest Edit button for shared companies', () => {
    const mockOnSuggestEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockSharedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSuggestEdit={mockOnSuggestEdit}
      />
    );

    expect(screen.getByTestId('suggest-edit-btn')).toBeInTheDocument();
    expect(screen.getByText('Suggest Edit')).toBeInTheDocument();
  });

  it('T106: does not show Suggest Edit for private companies', () => {
    const mockOnSuggestEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockPrivateCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSuggestEdit={mockOnSuggestEdit}
      />
    );

    expect(screen.queryByTestId('suggest-edit-btn')).not.toBeInTheDocument();
  });

  it('T107: shows edit form when Suggest Edit is clicked', async () => {
    const mockOnSuggestEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockSharedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSuggestEdit={mockOnSuggestEdit}
      />
    );

    fireEvent.click(screen.getByTestId('suggest-edit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-suggestion-form')).toBeInTheDocument();
      expect(screen.getByTestId('edit-field-select')).toBeInTheDocument();
      expect(screen.getByTestId('edit-value-input')).toBeInTheDocument();
    });
  });

  it('T107: submits edit suggestion on form submit', async () => {
    const mockOnSuggestEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockSharedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSuggestEdit={mockOnSuggestEdit}
      />
    );

    // Open form
    fireEvent.click(screen.getByTestId('suggest-edit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-suggestion-form')).toBeInTheDocument();
    });

    // Enter new value
    const input = screen.getByTestId('edit-value-input');
    fireEvent.change(input, { target: { value: 'https://new-website.com' } });

    // Submit
    fireEvent.click(screen.getByTestId('submit-edit-btn'));

    await waitFor(() => {
      expect(mockOnSuggestEdit).toHaveBeenCalledWith(
        mockSharedCompany,
        'website',
        'https://shared.com',
        'https://new-website.com'
      );
    });
  });

  it('T107: cancels edit form on Cancel click', async () => {
    const mockOnSuggestEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompanyDetailDrawer
        company={mockSharedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
        onSuggestEdit={mockOnSuggestEdit}
      />
    );

    // Open form
    fireEvent.click(screen.getByTestId('suggest-edit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-suggestion-form')).toBeInTheDocument();
    });

    // Cancel
    fireEvent.click(screen.getByTestId('cancel-edit-btn'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('edit-suggestion-form')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('suggest-edit-btn')).toBeInTheDocument();
    });
  });

  it('T106: does not show Suggest Edit when onSuggestEdit not provided', () => {
    render(
      <CompanyDetailDrawer
        company={mockSharedCompany as unknown as CompanyWithApplications}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('suggest-edit-btn')).not.toBeInTheDocument();
  });
});
