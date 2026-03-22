import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkerProfileForEmployer } from './WorkerProfileForEmployer';
import type { WorkerProfileData } from '@/hooks/useWorkerProfileForEmployer';
import type { UseResumeDownloadReturn } from '@/hooks/useResumeDownload';

// --- Mock setup ----------------------------------------------------------

const mockUseWorkerProfileForEmployer = vi.fn();
const mockDownload = vi.fn();
const mockUseResumeDownload = vi.fn();

vi.mock('@/hooks/useWorkerProfileForEmployer', () => ({
  useWorkerProfileForEmployer: (...args: unknown[]) =>
    mockUseWorkerProfileForEmployer(...args),
}));

vi.mock('@/hooks/useResumeDownload', () => ({
  useResumeDownload: (...args: unknown[]) => mockUseResumeDownload(...args),
}));

// --- Fixtures ------------------------------------------------------------

const profileWithDownload: WorkerProfileData = {
  profile: {
    id: 'worker-1',
    display_name: 'Ada Lovelace',
    bio: 'Mathematician and writer',
    avatar_url: 'https://example.com/avatar.png',
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
};

const profileVisibleToAll: WorkerProfileData = {
  profile: {
    id: 'worker-1',
    display_name: 'Ada Lovelace',
    bio: 'Mathematician and writer',
    avatar_url: null,
  },
  resume_access: 'download',
  resume: {
    id: 'resume-1',
    label: 'General CV',
    file_name: 'general.pdf',
    storage_path: 'worker-1/general.pdf',
    file_size: 102400,
    mime_type: 'application/pdf',
  },
  access_reason: 'visible_to_all',
};

const profileNoAccess: WorkerProfileData = {
  profile: {
    id: 'worker-2',
    display_name: 'Grace Hopper',
    bio: 'Computer scientist',
    avatar_url: null,
  },
  resume_access: 'none',
  resume: null,
  access_reason: null,
};

const profileNull: WorkerProfileData = {
  profile: null,
  resume_access: 'none',
  resume: null,
  access_reason: null,
};

const defaultDownloadReturn: UseResumeDownloadReturn = {
  download: mockDownload,
  isDownloading: false,
  error: null,
};

// --- Tests ---------------------------------------------------------------

describe('WorkerProfileForEmployer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseResumeDownload.mockReturnValue(defaultDownloadReturn);
  });

  it('renders nothing when profile is null (profile_public = false)', () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: profileNull,
      isLoading: false,
      error: null,
    });

    const { container } = render(
      <WorkerProfileForEmployer workerId="worker-1" viewerId="viewer-1" />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders "This worker\'s resume is private" when resume_access = none', () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: profileNoAccess,
      isLoading: false,
      error: null,
    });

    render(
      <WorkerProfileForEmployer workerId="worker-2" viewerId="viewer-1" />
    );

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(
      screen.getByText("This worker's resume is private.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /download/i })
    ).not.toBeInTheDocument();
  });

  it('renders Download button when resume_access = download and reason = applied_to_your_company', async () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: profileWithDownload,
      isLoading: false,
      error: null,
    });

    render(
      <WorkerProfileForEmployer workerId="worker-1" viewerId="viewer-1" />
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer CV')).toBeInTheDocument();
    expect(screen.getByText('Shared via application')).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: /download/i });
    expect(downloadBtn).toBeInTheDocument();

    await userEvent.click(downloadBtn);
    expect(mockDownload).toHaveBeenCalledWith(
      'worker-1/ada-cv.pdf',
      'ada-cv.pdf'
    );
  });

  it('renders Download button when resume_access = download and reason = visible_to_all', () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: profileVisibleToAll,
      isLoading: false,
      error: null,
    });

    render(
      <WorkerProfileForEmployer workerId="worker-1" viewerId="viewer-1" />
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('General CV')).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: /download/i });
    expect(downloadBtn).toBeInTheDocument();

    // Should NOT show "Shared via application" for visible_to_all
    expect(screen.queryByText('Shared via application')).not.toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(
      <WorkerProfileForEmployer workerId="worker-1" viewerId="viewer-1" />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('passes workerId and viewerId to the hook', () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(
      <WorkerProfileForEmployer workerId="w-abc" viewerId="v-xyz" />
    );

    expect(mockUseWorkerProfileForEmployer).toHaveBeenCalledWith(
      'w-abc',
      'v-xyz'
    );
  });
});
