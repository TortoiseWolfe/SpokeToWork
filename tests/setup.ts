import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import 'fake-indexeddb/auto';

// Mock Supabase client for all tests (prevents "Missing Supabase environment variables" errors)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: {}, error: null })
      ),
      signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
      updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
        unsubscribe: vi.fn(),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  })),
  getSupabase: vi.fn(() => ({})),
  supabase: {},
}));

// Mock AuthContext with reasonable defaults for component tests
// Unit tests can override with vi.doUnmock() if needed
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '123',
      email: 'test@example.com',
      user_metadata: { username: 'testuser' },
      email_confirmed_at: null, // Allow EmailVerificationNotice to render
    },
    session: { access_token: 'mock-token' },
    isLoading: false,
    isAuthenticated: true,
    signUp: vi.fn(async () => ({ error: null })),
    signIn: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    refreshSession: vi.fn(async () => {}),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Next.js navigation for all tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Note: usePaymentConsent is NOT globally mocked
// Tests that need it should mock it themselves (see PaymentConsentModal.test.tsx)
// This allows unit tests to test the real implementation

// Mock next/image to avoid happy-dom URL parsing issues
// happy-dom's URL parser fails when window.location context is corrupted by other tests
vi.mock('next/image', () => {
  const React = require('react');
  return {
    default: React.forwardRef(function MockImage(
      {
        src,
        alt,
        width,
        height,
        fill,
        className,
        ...props
      }: {
        src: string;
        alt: string;
        width?: number;
        height?: number;
        fill?: boolean;
        className?: string;
        [key: string]: unknown;
      },
      ref: React.Ref<HTMLImageElement>
    ) {
      return React.createElement('img', {
        ref,
        src: typeof src === 'object' ? (src as { src: string }).src : src,
        alt,
        width: fill ? undefined : width,
        height: fill ? undefined : height,
        className,
        'data-testid': 'next-image',
        ...props,
      });
    }),
  };
});

// Mock CSS imports
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('prismjs/themes/prism-tomorrow.css', () => ({}));
vi.mock('@/styles/prism-override.css', () => ({}));

// Mock Leaflet and react-leaflet for SSR-safe testing
// Leaflet requires `window` which doesn't exist in Node.js/jsdom after test teardown
vi.mock('leaflet', () => {
  const IconDefault = {
    prototype: { _getIconUrl: undefined },
    mergeOptions: vi.fn(),
  };
  const Icon = vi.fn().mockImplementation(() => ({}));
  (Icon as unknown as { Default: typeof IconDefault }).Default = IconDefault;

  return {
    default: {
      Icon,
      icon: vi.fn().mockReturnValue({}),
      divIcon: vi.fn().mockReturnValue({}),
      marker: vi.fn().mockReturnValue({
        addTo: vi.fn(),
        setLatLng: vi.fn(),
        bindPopup: vi.fn(),
      }),
      map: vi.fn().mockReturnValue({
        setView: vi.fn(),
        invalidateSize: vi.fn(),
        getContainer: vi.fn(),
        remove: vi.fn(),
      }),
      polyline: vi.fn().mockReturnValue({
        addTo: vi.fn(),
        setLatLngs: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ isValid: () => false }),
      }),
      latLng: vi.fn().mockImplementation((lat, lng) => ({ lat, lng })),
      latLngBounds: vi.fn().mockReturnValue({
        extend: vi.fn(),
        isValid: vi.fn().mockReturnValue(false),
      }),
    },
    Icon,
    divIcon: vi.fn().mockReturnValue({}),
    polyline: vi.fn().mockReturnValue({}),
    latLng: vi.fn().mockImplementation((lat, lng) => ({ lat, lng })),
  };
});

vi.mock('react-leaflet', () => {
  const React = require('react');
  return {
    MapContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        'div',
        { 'data-testid': 'mock-leaflet-map', className: 'leaflet-container' },
        children
      ),
    TileLayer: () => null,
    Marker: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-marker' }, children),
    Popup: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', null, children),
    Polyline: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-polyline' }, children),
    Circle: () => React.createElement('div', { 'data-testid': 'mock-circle' }),
    CircleMarker: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        'div',
        { 'data-testid': 'mock-circle-marker' },
        children
      ),
    useMap: () => ({
      setView: vi.fn(),
      invalidateSize: vi.fn(),
      getContainer: vi.fn(() => document.createElement('div')),
      on: vi.fn(),
      off: vi.fn(),
    }),
    useMapEvents: (handlers: Record<string, unknown>) => {
      // Return mock map instance
      return {
        setView: vi.fn(),
        invalidateSize: vi.fn(),
        getContainer: vi.fn(() => document.createElement('div')),
      };
    },
  };
});

// Extend Vitest matchers with jest-axe accessibility matchers
expect.extend(toHaveNoViolations);

// Clean up after each test - comprehensive cleanup for singleFork mode
afterEach(() => {
  cleanup();

  // Clear all mocks to prevent state leaking between tests
  vi.clearAllMocks();

  // Clear localStorage and sessionStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors in environments without storage
    }
  }

  // Clear document cookies
  if (typeof document !== 'undefined' && document.cookie) {
    try {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    } catch (e) {
      // Ignore errors
    }
  }

  // Clear IndexedDB databases (fake-indexeddb persists in singleFork mode)
  if (typeof indexedDB !== 'undefined') {
    try {
      // Delete known database names used by the app
      indexedDB.deleteDatabase('OfflineFormSubmissions');
    } catch (e) {
      // Ignore errors in environments without IndexedDB
    }
  }
});

// Mock window.matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock IntersectionObserver (class required for vitest 4.0)
global.IntersectionObserver = class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver (class required for vitest 4.0)
global.ResizeObserver = class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
} as unknown as typeof ResizeObserver;

// Track blob dimensions for createImageBitmap
const blobDimensions = new WeakMap<Blob, { width: number; height: number }>();

// Mock HTMLCanvasElement.getContext and toBlob for avatar tests
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '10px sans-serif',
  }));

  // Mock toBlob for avatar image processing
  HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type = 'image/png',
    quality = 0.92
  ) {
    // Create a mock blob and track the canvas dimensions
    const blob = new Blob(['mock-image-data'], { type });
    blobDimensions.set(blob, {
      width: this.width,
      height: this.height,
    });
    setTimeout(() => callback(blob), 0);
  });
}

// Mock createImageBitmap for avatar validation
if (typeof global !== 'undefined') {
  global.createImageBitmap = vi.fn().mockImplementation((source: any) => {
    // Handle File/Blob objects
    if (source instanceof File || source instanceof Blob) {
      // Check if we tracked dimensions for this blob
      const dims = blobDimensions.get(source);
      if (dims) {
        return Promise.resolve({
          width: dims.width,
          height: dims.height,
          close: vi.fn(),
        });
      }
      // Special case: files with "not an image" content (text) should reject
      if (source.size < 20 && source.type.startsWith('image/')) {
        return Promise.reject(new Error('Failed to decode image'));
      }
      // Default for unknown blobs
      return Promise.resolve({
        width: 500,
        height: 500,
        close: vi.fn(),
      });
    }
    // Handle image elements or objects with width/height
    return Promise.resolve({
      width: source.width || 500,
      height: source.height || 500,
      close: vi.fn(),
    });
  });
}

// Mock URL.createObjectURL and revokeObjectURL for blob handling
if (typeof global !== 'undefined' && typeof URL !== 'undefined') {
  const blobUrls = new Map<string, Blob>();
  let urlCounter = 0;

  URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
    const url = `blob:http://localhost/${++urlCounter}`;
    blobUrls.set(url, blob);
    return url;
  });

  URL.revokeObjectURL = vi.fn().mockImplementation((url: string) => {
    blobUrls.delete(url);
  });
}

// Mock HTMLDialogElement for payment modals (JSDOM doesn't support dialog element)
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal =
    HTMLDialogElement.prototype.showModal ||
    function (this: HTMLDialogElement) {
      this.open = true;
    };

  HTMLDialogElement.prototype.close =
    HTMLDialogElement.prototype.close ||
    function (this: HTMLDialogElement) {
      this.open = false;
    };
}
