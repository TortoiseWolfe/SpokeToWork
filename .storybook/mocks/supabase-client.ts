/**
 * Mock Supabase client for Storybook
 *
 * Replaces @/lib/supabase/client so no story makes real network requests.
 * All queries resolve immediately with empty/null data.
 */

/** Proxy-based chainable query builder — any method chain resolves to { data: null, error: null } */
function createMockQueryBuilder(): any {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Terminal methods that return promises
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null });
      }
      // Make the builder thenable (await-able at any point in the chain)
      if (prop === 'then') {
        return (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
      // All other methods return the proxy (infinitely chainable)
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockClient: any = {
  from: () => createMockQueryBuilder(),
  rpc: () => Promise.resolve({ data: null, error: null }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
    signUp: () => Promise.resolve({ data: {}, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
  },
  channel: () => ({
    on() {
      return this;
    },
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  removeChannel: () => {},
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: () => Promise.resolve({ data: null, error: null }),
      list: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
};

export function createClient() {
  return mockClient;
}

export function getSupabase() {
  return mockClient;
}

export const supabase = mockClient;

export async function isSupabaseOnline() {
  return false;
}

export function onConnectionChange(_callback: (online: boolean) => void) {
  return () => {};
}
