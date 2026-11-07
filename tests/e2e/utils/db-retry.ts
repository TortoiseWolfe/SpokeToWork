/**
 * True when a Supabase error message is the database or its gateway failing
 * under load, never an answer about our data. These are the three shapes seen
 * in the full Chromium + Firefox + WebKit matrix on 6 Nov 2026, when 11 of 12
 * WebKit jobs died in setup:
 *   - "canceling statement due to statement timeout" (Postgres gave up)
 *   - "Unexpected token '<', "<!DOCTYPE ..." (gateway returned an HTML error page)
 *   - "{}" (auth admin call failed with no message)
 * Only these are retried. A real error (missing user, bad row) still throws
 * on the first attempt, and nothing here ever wraps a test assertion.
 */
export function isTransientDbError(message: string | undefined): boolean {
  if (message === undefined) return false;
  return (
    /statement timeout|Unexpected token '<'|<!DOCTYPE|fetch failed|ECONNRESET|ETIMEDOUT|\b50[234]\b/i.test(
      message
    ) || message.trim() === '{}'
  );
}

/** Retry a Supabase call that returns { error }, only on transient database errors. */
export async function retryOnDbError<
  T extends { error: { message: string } | null },
>(
  label: string,
  call: () => PromiseLike<T>,
  attempts = 5,
  baseDelayMs = 3000
): Promise<T> {
  let result = await call();
  for (let attempt = 1; attempt < attempts; attempt++) {
    if (!result.error || !isTransientDbError(result.error.message)) {
      return result;
    }
    const delay = baseDelayMs * attempt + Math.random() * 1000;
    console.log(
      `  ↻ ${label}: database error "${result.error.message.slice(0, 80)}", retry ${attempt}/${attempts - 1} in ${Math.round(delay)}ms`
    );
    await new Promise((r) => setTimeout(r, delay));
    result = await call();
  }
  return result;
}
