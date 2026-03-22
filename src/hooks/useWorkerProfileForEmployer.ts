'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WorkerProfileData {
  profile: {
    id: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
  } | null;
  resume_access: 'none' | 'download';
  resume: {
    id: string;
    label: string;
    file_name: string;
    storage_path: string;
    file_size: number;
    mime_type: string;
  } | null;
  access_reason: string | null;
}

export function useWorkerProfileForEmployer(
  workerId?: string,
  viewerId?: string
) {
  const [data, setData] = useState<WorkerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workerId || !viewerId) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('get_worker_profile_for_employer', {
      p_worker_id: workerId,
      p_viewer_id: viewerId,
    })
      .then(({ data: result, error: rpcError }: { data: unknown; error: { message: string } | null }) => {
        if (rpcError) {
          setError(new Error(rpcError.message));
        } else {
          setData(result as WorkerProfileData);
        }
        setIsLoading(false);
      });
  }, [workerId, viewerId]);

  return { data, isLoading, error };
}
