'use client';

import { useEffect } from 'react';
import { handleChunkLoadError } from '@/lib/chunk-load-recovery';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // A ChunkLoadError that reached the error boundary gets the same
    // once-per-session reload as the window listeners.
    handleChunkLoadError(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
