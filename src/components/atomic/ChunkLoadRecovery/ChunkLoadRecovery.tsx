'use client';

import { useEffect } from 'react';
import { initChunkLoadRecovery } from '@/lib/chunk-load-recovery';

/**
 * ChunkLoadRecovery Component
 *
 * Mounts once at the app root to listen for ChunkLoadError events
 * (thrown when Next.js fails to load a dynamic chunk after a deployment).
 * Performs a one-time page reload to recover, guarded by a sessionStorage flag.
 */
export default function ChunkLoadRecovery(): null {
  useEffect(() => {
    const cleanup = initChunkLoadRecovery();
    return cleanup;
  }, []);

  return null;
}

