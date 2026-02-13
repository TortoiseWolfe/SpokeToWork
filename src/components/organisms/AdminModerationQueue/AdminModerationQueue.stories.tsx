import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AdminModerationQueue from './AdminModerationQueue';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';

const meta: Meta<typeof AdminModerationQueue> = {
  title: 'Organisms/AdminModerationQueue',
  component: AdminModerationQueue,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Admin moderation queue for reviewing company contributions and edit suggestions.',
      },
    },
  },
  argTypes: {
    onApproveContribution: { action: 'approveContribution' },
    onRejectContribution: { action: 'rejectContribution' },
    onMergeContribution: { action: 'mergeContribution' },
    onApproveEdit: { action: 'approveEdit' },
    onRejectEdit: { action: 'rejectEdit' },
  },
};

export default meta;
type Story = StoryObj<typeof AdminModerationQueue>;

const mockContributions: ModerationQueueItem[] = [
  {
    id: 'contrib-1',
    type: 'contribution',
    user_id: 'user-1',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
    private_company_id: 'private-1',
    private_company_name: 'Innovative Tech Solutions',
  },
  {
    id: 'contrib-2',
    type: 'contribution',
    user_id: 'user-2',
    status: 'pending',
    created_at: '2024-01-16T10:00:00Z',
    private_company_id: 'private-2',
    private_company_name: 'Green Energy Corp',
  },
  {
    id: 'contrib-3',
    type: 'contribution',
    user_id: 'user-3',
    status: 'pending',
    created_at: '2024-01-17T10:00:00Z',
    private_company_id: 'private-3',
    private_company_name: 'Healthcare Plus',
  },
];

const mockEditSuggestions: ModerationQueueItem[] = [
  {
    id: 'edit-1',
    type: 'edit_suggestion',
    user_id: 'user-1',
    status: 'pending',
    created_at: '2024-01-17T10:00:00Z',
    shared_company_id: 'shared-1',
    shared_company_name: 'Acme Corporation',
    field_name: 'website',
    old_value: 'https://acme.com',
    new_value: 'https://www.acme.io',
    reason: 'Company rebranded and updated their domain',
  },
  {
    id: 'edit-2',
    type: 'edit_suggestion',
    user_id: 'user-2',
    status: 'pending',
    created_at: '2024-01-18T10:00:00Z',
    shared_company_id: 'shared-2',
    shared_company_name: 'TechStart Inc',
    field_name: 'careers_url',
    old_value: null,
    new_value: 'https://careers.techstart.com',
    reason: 'Added careers page link',
  },
];

export const Default: Story = {
  args: {
    items: [...mockContributions, ...mockEditSuggestions],
  },
};

export const ContributionsOnly: Story = {
  args: {
    items: mockContributions,
  },
  parameters: {
    docs: {
      description: {
        story: 'Queue containing only company contributions awaiting approval.',
      },
    },
  },
};

export const EditSuggestionsOnly: Story = {
  args: {
    items: mockEditSuggestions,
  },
  parameters: {
    docs: {
      description: {
        story: 'Queue containing only edit suggestions awaiting review.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty moderation queue with no pending items.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Queue in loading state while fetching pending items.',
      },
    },
  },
};

export const SingleContribution: Story = {
  args: {
    items: [mockContributions[0]],
  },
  parameters: {
    docs: {
      description: {
        story: 'Queue with a single contribution pending review.',
      },
    },
  },
};

export const SingleEditSuggestion: Story = {
  args: {
    items: [mockEditSuggestions[0]],
  },
  parameters: {
    docs: {
      description: {
        story: 'Queue with a single edit suggestion pending review.',
      },
    },
  },
};

export const ManyItems: Story = {
  args: {
    items: [
      ...mockContributions,
      ...mockContributions.map((c) => ({
        ...c,
        id: `${c.id}-copy`,
        private_company_name: `${c.private_company_name} 2`,
      })),
      ...mockEditSuggestions,
      ...mockEditSuggestions.map((e) => ({
        ...e,
        id: `${e.id}-copy`,
        shared_company_name: `${e.shared_company_name} 2`,
      })),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Queue with many pending items showing scroll behavior.',
      },
    },
  },
};
