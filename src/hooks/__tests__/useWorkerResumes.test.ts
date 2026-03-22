import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock service methods
const mockGetWorkerResumes = vi.fn();
const mockUploadResume = vi.fn();
const mockDeleteResume = vi.fn();
const mockSetDefault = vi.fn();
const mockRenameResume = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/resumes/resume-service', () => ({
  ResumeService: class MockResumeService {
    getWorkerResumes(userId: string) {
      return mockGetWorkerResumes(userId);
    }
    uploadResume(userId: string, file: File, label: string) {
      return mockUploadResume(userId, file, label);
    }
    deleteResume(resumeId: string) {
      return mockDeleteResume(resumeId);
    }
    setDefault(resumeId: string) {
      return mockSetDefault(resumeId);
    }
    renameResume(resumeId: string, label: string) {
      return mockRenameResume(resumeId, label);
    }
  },
}));

import { useWorkerResumes } from '../useWorkerResumes';

const makeResume = (id: string) => ({
  id,
  user_id: 'u1',
  label: `Resume ${id}`,
  storage_path: `resumes/u1/${id}.pdf`,
  file_name: `${id}.pdf`,
  mime_type: 'application/pdf',
  file_size: 1024,
  is_default: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('useWorkerResumes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkerResumes.mockResolvedValue([makeResume('r1'), makeResume('r2')]);
    mockUploadResume.mockResolvedValue(makeResume('r3'));
    mockDeleteResume.mockResolvedValue(undefined);
    mockSetDefault.mockResolvedValue(undefined);
    mockRenameResume.mockResolvedValue(undefined);
  });

  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useWorkerResumes('u1'));
    expect(result.current.isLoading).toBe(true);
  });

  it('loads resumes from service', async () => {
    const { result } = renderHook(() => useWorkerResumes('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetWorkerResumes).toHaveBeenCalledWith('u1');
    expect(result.current.resumes).toHaveLength(2);
    expect(result.current.resumes[0].id).toBe('r1');
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading false without fetching when userId undefined', async () => {
    const { result } = renderHook(() => useWorkerResumes(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetWorkerResumes).not.toHaveBeenCalled();
    expect(result.current.resumes).toHaveLength(0);
  });

  it('sets error on load failure', async () => {
    mockGetWorkerResumes.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWorkerResumes('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('upload calls service.uploadResume and refetches', async () => {
    mockGetWorkerResumes
      .mockResolvedValueOnce([makeResume('r1'), makeResume('r2')])
      .mockResolvedValueOnce([makeResume('r1'), makeResume('r2'), makeResume('r3')]);

    const { result } = renderHook(() => useWorkerResumes('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.upload(file, 'My Resume');
    });

    expect(mockUploadResume).toHaveBeenCalledWith('u1', file, 'My Resume');
    expect(mockGetWorkerResumes).toHaveBeenCalledTimes(2);
    expect(result.current.resumes).toHaveLength(3);
  });

  it('remove calls service.deleteResume and refetches', async () => {
    mockGetWorkerResumes
      .mockResolvedValueOnce([makeResume('r1'), makeResume('r2')])
      .mockResolvedValueOnce([makeResume('r2')]);

    const { result } = renderHook(() => useWorkerResumes('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.remove('r1');
    });

    expect(mockDeleteResume).toHaveBeenCalledWith('r1');
    expect(mockGetWorkerResumes).toHaveBeenCalledTimes(2);
    expect(result.current.resumes).toHaveLength(1);
  });

  it('setDefault calls service.setDefault and refetches', async () => {
    const updatedR1 = { ...makeResume('r1'), is_default: true };
    mockGetWorkerResumes
      .mockResolvedValueOnce([makeResume('r1'), makeResume('r2')])
      .mockResolvedValueOnce([updatedR1, makeResume('r2')]);

    const { result } = renderHook(() => useWorkerResumes('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setDefault('r1');
    });

    expect(mockSetDefault).toHaveBeenCalledWith('r1');
    expect(mockGetWorkerResumes).toHaveBeenCalledTimes(2);
    expect(result.current.resumes[0].is_default).toBe(true);
  });

  it('rename calls service.renameResume and refetches', async () => {
    const renamedR1 = { ...makeResume('r1'), label: 'Updated Label' };
    mockGetWorkerResumes
      .mockResolvedValueOnce([makeResume('r1'), makeResume('r2')])
      .mockResolvedValueOnce([renamedR1, makeResume('r2')]);

    const { result } = renderHook(() => useWorkerResumes('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.rename('r1', 'Updated Label');
    });

    expect(mockRenameResume).toHaveBeenCalledWith('r1', 'Updated Label');
    expect(mockGetWorkerResumes).toHaveBeenCalledTimes(2);
    expect(result.current.resumes[0].label).toBe('Updated Label');
  });
});
