'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ResumeService } from '@/lib/resumes/resume-service';
import type { Resume } from '@/lib/resumes/types';

export interface UseWorkerResumesReturn {
  resumes: Resume[];
  isLoading: boolean;
  error: Error | null;
  upload: (file: File, label: string) => Promise<void>;
  remove: (resumeId: string) => Promise<void>;
  setDefault: (resumeId: string) => Promise<void>;
  rename: (resumeId: string, label: string) => Promise<void>;
}

export function useWorkerResumes(userId: string | undefined): UseWorkerResumesReturn {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const service = new ResumeService(supabase);
        const rows = await service.getWorkerResumes(userId!);

        if (cancelled) return;
        setResumes(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const service = new ResumeService(supabase);
    const rows = await service.getWorkerResumes(userId);
    setResumes(rows);
  }, [userId]);

  const upload = useCallback(async (file: File, label: string) => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const service = new ResumeService(supabase);
      await service.uploadResume(userId, file, label);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [userId, refetch]);

  const remove = useCallback(async (resumeId: string) => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const service = new ResumeService(supabase);
      await service.deleteResume(resumeId);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [userId, refetch]);

  const setDefault = useCallback(async (resumeId: string) => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const service = new ResumeService(supabase);
      await service.setDefault(resumeId);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [userId, refetch]);

  const rename = useCallback(async (resumeId: string, label: string) => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const service = new ResumeService(supabase);
      await service.renameResume(resumeId, label);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [userId, refetch]);

  return { resumes, isLoading, error, upload, remove, setDefault, rename };
}
