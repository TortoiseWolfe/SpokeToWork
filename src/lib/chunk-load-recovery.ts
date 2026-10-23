/**
 * Chunk load recovery.
 *
 * A tab left open across a deploy can navigate to a route whose chunk was
 * replaced, get a 404 for the old hash, and throw ChunkLoadError. Reloading
 * fetches the new build. The reload happens once per session: a
 * sessionStorage flag blocks a second reload until the page has stayed up
 * for STABLE_MS, so a chunk that stays broken can never loop.
 */

const RECOVERY_ATTEMPTED_KEY = 'stw-chunk-recovery-attempted';

/** How long a reloaded page must survive before the one-shot flag resets. */
export const STABLE_MS = 10_000;

const CHUNK_LOAD_ERROR_PATTERNS = [
  'Loading chunk',
  'Loading CSS chunk',
  'Failed to fetch dynamically imported module',
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  return (
    typeof message === 'string' &&
    CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
  );
}

export function hasRecoveryBeenAttempted(): boolean {
  try {
    return sessionStorage.getItem(RECOVERY_ATTEMPTED_KEY) === 'true';
  } catch {
    // Storage blocked: treat as attempted so we never reload without a guard.
    return true;
  }
}

export function markRecoveryAttempted(): void {
  try {
    sessionStorage.setItem(RECOVERY_ATTEMPTED_KEY, 'true');
  } catch {
    // Nothing to do; hasRecoveryBeenAttempted fails closed.
  }
}

export function clearRecoveryFlag(): void {
  try {
    sessionStorage.removeItem(RECOVERY_ATTEMPTED_KEY);
  } catch {
    // Ignore blocked storage.
  }
}

export function reloadPage(): void {
  window.location.reload();
}

/**
 * Reloads once if `error` is a chunk load failure and this session has not
 * already tried. Returns true when a reload was triggered.
 */
export function handleChunkLoadError(error: unknown): boolean {
  if (typeof window === 'undefined') return false;
  if (!isChunkLoadError(error)) return false;
  if (hasRecoveryBeenAttempted()) return false;

  markRecoveryAttempted();
  reloadPage();
  return true;
}

/**
 * Installs the window listeners and schedules the flag reset. Returns a
 * cleanup function.
 */
export function initChunkLoadRecovery(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent): void => {
    handleChunkLoadError(event.error ?? event);
  };
  const onRejection = (event: PromiseRejectionEvent): void => {
    handleChunkLoadError(event.reason);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // Reset the one-shot flag only once the (possibly reloaded) page has proven
  // stable, so an immediately repeating failure cannot reload again.
  const stableTimer = window.setTimeout(clearRecoveryFlag, STABLE_MS);

  return () => {
    window.clearTimeout(stableTimer);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
