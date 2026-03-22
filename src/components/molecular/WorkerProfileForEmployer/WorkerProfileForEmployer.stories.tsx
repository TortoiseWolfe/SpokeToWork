import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkerProfileForEmployer } from './WorkerProfileForEmployer';

const meta: Meta<typeof WorkerProfileForEmployer> = {
  title: 'Molecular/WorkerProfileForEmployer',
  component: WorkerProfileForEmployer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Employer-facing worker profile view. Displays worker info and resume access based on visibility settings and application status.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WorkerProfileForEmployer>;

export const ProfileHidden: Story = {
  args: {
    workerId: 'worker-hidden',
    viewerId: 'viewer-1',
  },
  parameters: {
    mockData: {
      profile: null,
      resume_access: 'none',
      resume: null,
      access_reason: null,
    },
  },
};

export const ResumePrivate: Story = {
  args: {
    workerId: 'worker-private',
    viewerId: 'viewer-1',
  },
  parameters: {
    mockData: {
      profile: {
        id: 'worker-private',
        display_name: 'Grace Hopper',
        bio: 'Computer scientist and Navy rear admiral',
        avatar_url: null,
      },
      resume_access: 'none',
      resume: null,
      access_reason: null,
    },
  },
};

export const ResumeDownloadViaApplication: Story = {
  args: {
    workerId: 'worker-1',
    viewerId: 'viewer-1',
  },
  parameters: {
    mockData: {
      profile: {
        id: 'worker-1',
        display_name: 'Ada Lovelace',
        bio: 'Mathematician and writer, recognized as the first computer programmer.',
        avatar_url: 'https://i.pravatar.cc/150?u=ada',
      },
      resume_access: 'download',
      resume: {
        id: 'resume-1',
        label: 'Software Engineer CV',
        file_name: 'ada-cv.pdf',
        storage_path: 'worker-1/ada-cv.pdf',
        file_size: 204800,
        mime_type: 'application/pdf',
      },
      access_reason: 'applied_to_your_company',
    },
  },
};

export const ResumeDownloadVisibleToAll: Story = {
  args: {
    workerId: 'worker-2',
    viewerId: 'viewer-1',
  },
  parameters: {
    mockData: {
      profile: {
        id: 'worker-2',
        display_name: 'Margaret Hamilton',
        bio: 'Software engineer who led the Apollo guidance software team.',
        avatar_url: 'https://i.pravatar.cc/150?u=margaret',
      },
      resume_access: 'download',
      resume: {
        id: 'resume-2',
        label: 'General Resume',
        file_name: 'margaret-resume.pdf',
        storage_path: 'worker-2/margaret-resume.pdf',
        file_size: 153600,
        mime_type: 'application/pdf',
      },
      access_reason: 'visible_to_all',
    },
  },
};

export const Loading: Story = {
  args: {
    workerId: 'worker-loading',
    viewerId: 'viewer-1',
  },
  parameters: {
    mockData: '__loading__',
  },
};
