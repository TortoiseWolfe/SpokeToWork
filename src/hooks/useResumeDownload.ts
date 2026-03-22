'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UseResumeDownloadReturn {
  download: (storagePath: string, fileName: string) => Promise<void>;
  isDownloading: boolean;
  error: Error | null;
}

export function useResumeDownload(): UseResumeDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const download = useCallback(async (storagePath: string, fileName: string) => {
    setIsDownloading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signedUrlError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(storagePath, 60);

      if (signedUrlError) throw signedUrlError;

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading, error };
}
