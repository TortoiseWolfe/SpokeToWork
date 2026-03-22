import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { WorkerProfileForEmployer } from './WorkerProfileForEmployer';

expect.extend(toHaveNoViolations);

// --- Mock setup ----------------------------------------------------------

const mockUseWorkerProfileForEmployer = vi.fn();
const mockDownload = vi.fn();

vi.mock('@/hooks/useWorkerProfileForEmployer', () => ({
  useWorkerProfileForEmployer: (...args: unknown[]) =>
    mockUseWorkerProfileForEmployer(...args),
}));

vi.mock('@/hooks/useResumeDownload', () => ({
  useResumeDownload: () => ({
    download: mockDownload,
    isDownloading: false,
    error: null,
  }),
}));

// --- Tests ---------------------------------------------------------------

describe('WorkerProfileForEmployer Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no violations when showing profile with resume download', async () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: {
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
      },
      isLoading: false,
      error: null,
    });

    const { container } = render(
      <WorkerProfileForEmployer workerId="worker-1" viewerId="viewer-1" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations when resume is private', async () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: {
        profile: {
          id: 'worker-2',
          display_name: 'Grace Hopper',
          bio: null,
          avatar_url: null,
        },
        resume_access: 'none',
        resume: null,
        access_reason: null,
      },
      isLoading: false,
      error: null,
    });

    const { container } = render(
      <WorkerProfileForEmployer workerId="worker-2" viewerId="viewer-1" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations in loading state', async () => {
    mockUseWorkerProfileForEmployer.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(
      <WorkerProfileForEmployer workerId="worker-1" viewerId="viewer-1" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
