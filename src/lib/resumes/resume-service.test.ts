import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock Supabase client ---
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: mockStorageFrom },
  })),
}));

import { ResumeService } from './resume-service';
import type { Resume } from './types';

// Helper: build a minimal Resume fixture
function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: 'r1',
    user_id: 'u1',
    label: 'My Resume',
    storage_path: 'resumes/u1/abc.pdf',
    file_name: 'resume.pdf',
    mime_type: 'application/pdf',
    file_size: 1024,
    is_default: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper: build a minimal File-like object
function makeFile(
  name = 'resume.pdf',
  type = 'application/pdf',
  size = 1024
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('ResumeService', () => {
  let service: ResumeService;
  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: mockStorageFrom },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ResumeService(mockSupabase);
  });

  // ---------------------------------------------------------------------------
  // getWorkerResumes
  // ---------------------------------------------------------------------------
  describe('getWorkerResumes', () => {
    it('returns resumes ordered by created_at', async () => {
      const mockData = [makeResume({ id: 'r1' }), makeResume({ id: 'r2' })];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const result = await service.getWorkerResumes('u1');
      expect(mockFrom).toHaveBeenCalledWith('worker_resumes');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('r1');
    });
  });

  // ---------------------------------------------------------------------------
  // uploadResume
  // ---------------------------------------------------------------------------
  describe('uploadResume', () => {
    it('validates file, uploads to storage, inserts row, returns resume', async () => {
      const file = makeFile('cv.pdf', 'application/pdf', 2048);
      const inserted = makeResume({ id: 'r-new', file_name: 'cv.pdf' });

      // getWorkerResumes — returns one existing resume so no setDefault call
      const mockOrderFirst = vi.fn().mockResolvedValue({
        data: [makeResume()],
        error: null,
      });
      const mockEqFirst = vi.fn().mockReturnValue({ order: mockOrderFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqFirst });

      // insert chain: .from().insert().select().single()
      const mockSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
      const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

      // mockFrom returns different objects on successive calls
      mockFrom
        .mockReturnValueOnce({ select: mockSelectFirst }) // getWorkerResumes
        .mockReturnValueOnce({ insert: mockInsert });    // insert row

      // storage upload
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'resumes/u1/abc.pdf' }, error: null });
      mockStorageFrom.mockReturnValue({ upload: mockUpload });

      const result = await service.uploadResume('u1', file, 'My CV');
      expect(mockStorageFrom).toHaveBeenCalledWith('resumes');
      expect(mockUpload).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual(inserted);
    });

    it('auto-sets is_default on first upload', async () => {
      const file = makeFile('first.pdf', 'application/pdf', 512);
      const inserted = makeResume({ id: 'r-first', is_default: false });

      // getWorkerResumes — empty (first upload)
      const mockOrderEmpty = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEqEmpty = vi.fn().mockReturnValue({ order: mockOrderEmpty });
      const mockSelectEmpty = vi.fn().mockReturnValue({ eq: mockEqEmpty });

      // insert row
      const mockSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
      const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

      mockFrom
        .mockReturnValueOnce({ select: mockSelectEmpty }) // getWorkerResumes
        .mockReturnValueOnce({ insert: mockInsert });    // insert row

      // storage upload
      mockStorageFrom.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'resumes/u1/x.pdf' }, error: null }),
      });

      // setDefault RPC call
      mockRpc.mockResolvedValue({ data: null, error: null });

      await service.uploadResume('u1', file, 'First Resume');
      expect(mockRpc).toHaveBeenCalledWith('set_default_resume', { p_resume_id: 'r-first' });
    });

    it('rejects invalid file type', async () => {
      const file = makeFile('script.js', 'application/javascript', 100);
      await expect(service.uploadResume('u1', file, 'Bad File')).rejects.toThrow(
        /invalid file type/i
      );
    });

    it('rejects oversized file', async () => {
      // 11 MB — over the 10 MB limit
      const file = makeFile('huge.pdf', 'application/pdf', 11 * 1024 * 1024);
      await expect(service.uploadResume('u1', file, 'Huge PDF')).rejects.toThrow(
        /10MB/i
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deleteResume
  // ---------------------------------------------------------------------------
  describe('deleteResume', () => {
    it('removes storage object and row', async () => {
      const resume = makeResume({ id: 'r1', storage_path: 'resumes/u1/abc.pdf', is_default: false });

      // fetch resume row: .from().select().eq().single()
      const mockFetchSingle = vi.fn().mockResolvedValue({ data: resume, error: null });
      const mockFetchEq = vi.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEq });

      // delete row: .from().delete().eq()
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      mockFrom
        .mockReturnValueOnce({ select: mockFetchSelect }) // fetch row
        .mockReturnValueOnce({ delete: mockDelete });    // delete row

      // storage remove
      const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });
      mockStorageFrom.mockReturnValue({ remove: mockRemove });

      await service.deleteResume('r1');
      expect(mockRemove).toHaveBeenCalledWith(['resumes/u1/abc.pdf']);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('promotes next oldest resume if deleted was default', async () => {
      const defaultResume = makeResume({ id: 'r1', is_default: true, storage_path: 'resumes/u1/r1.pdf' });
      const nextResume = makeResume({ id: 'r2', is_default: false, created_at: '2026-01-02T00:00:00Z' });

      // fetch resume row
      const mockFetchSingle = vi.fn().mockResolvedValue({ data: defaultResume, error: null });
      const mockFetchEq = vi.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEq });

      // delete row
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      // getWorkerResumes after delete — returns remaining resumes
      const mockRemainingOrder = vi.fn().mockResolvedValue({ data: [nextResume], error: null });
      const mockRemainingEq = vi.fn().mockReturnValue({ order: mockRemainingOrder });
      const mockRemainingSelect = vi.fn().mockReturnValue({ eq: mockRemainingEq });

      mockFrom
        .mockReturnValueOnce({ select: mockFetchSelect })   // fetch row
        .mockReturnValueOnce({ delete: mockDelete })        // delete row
        .mockReturnValueOnce({ select: mockRemainingSelect }); // getWorkerResumes

      // storage remove
      mockStorageFrom.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // setDefault RPC
      mockRpc.mockResolvedValue({ data: null, error: null });

      await service.deleteResume('r1');
      expect(mockRpc).toHaveBeenCalledWith('set_default_resume', { p_resume_id: 'r2' });
    });
  });

  // ---------------------------------------------------------------------------
  // setDefault
  // ---------------------------------------------------------------------------
  describe('setDefault', () => {
    it('calls set_default_resume RPC with resume id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      await service.setDefault('r1');
      expect(mockRpc).toHaveBeenCalledWith('set_default_resume', { p_resume_id: 'r1' });
    });
  });

  // ---------------------------------------------------------------------------
  // renameResume
  // ---------------------------------------------------------------------------
  describe('renameResume', () => {
    it('updates the label column for the given resume id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await service.renameResume('r1', 'New Label');
      expect(mockFrom).toHaveBeenCalledWith('worker_resumes');
      expect(mockUpdate).toHaveBeenCalledWith({ label: 'New Label' });
      expect(mockEq).toHaveBeenCalledWith('id', 'r1');
    });
  });
});
