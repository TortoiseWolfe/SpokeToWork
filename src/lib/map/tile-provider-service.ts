/**
 * Tile Provider Service - Feature 041: Bicycle Route Planning
 *
 * Manages map tile providers including cycling-optimized tiles.
 * Handles provider preferences and API key management.
 *
 * @see specs/041-bicycle-route-planning/contracts/route-types.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MapTileProvider } from '@/types/route';

// Default tile URL constants
export const DEFAULT_TILE_URL =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';

// Cycling-optimized tile URLs (requires API key)
export const CYCLING_TILE_URL =
  'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png';
export const THUNDERFOREST_ATTRIBUTION =
  '&copy; <a href="https://www.thunderforest.com">Thunderforest</a>, &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';

// LocalStorage keys
const STORAGE_KEY_PROVIDER = 'spoketowork_tile_provider';
const STORAGE_KEY_API_KEY = 'spoketowork_thunderforest_key';

/**
 * Tile Provider Service class
 */
export class TileProviderService {
  private supabase: SupabaseClient;
  private providers: MapTileProvider[] = [];
  private selectedProvider: MapTileProvider | null = null;
  private apiKey: string | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Initialize the service - load providers from database and preferences from localStorage
   */
  async initialize(): Promise<void> {
    await this.loadProviders();
    this.loadPreferences();
  }

  /**
   * Load tile providers from database
   */
  async loadProviders(): Promise<MapTileProvider[]> {
    const { data, error } = await this.supabase
      .from('map_tile_providers')
      .select('*')
      .eq('is_enabled', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    this.providers = data ?? [];
    return this.providers;
  }

  /**
   * Load user preferences from localStorage
   */
  private loadPreferences(): void {
    if (typeof window === 'undefined') return;

    const providerName = localStorage.getItem(STORAGE_KEY_PROVIDER);
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY);

    this.apiKey = apiKey;

    if (providerName && this.providers.length) {
      const provider = this.providers.find((p) => p.name === providerName);
      if (provider) {
        this.selectedProvider = provider;
      }
    }

    // Default to first non-API-key provider if no selection
    if (!this.selectedProvider && this.providers.length) {
      this.selectedProvider =
        this.providers.find((p) => !p.requires_api_key) ?? this.providers[0];
    }
  }

  /**
   * Get all available providers
   */
  getProviders(): MapTileProvider[] {
    return this.providers;
  }

  /**
   * Get cycling-optimized providers
   */
  getCyclingProviders(): MapTileProvider[] {
    return this.providers.filter((p) => p.is_cycling_optimized);
  }

  /**
   * Get the currently selected provider
   */
  getSelectedProvider(): MapTileProvider | null {
    return this.selectedProvider;
  }

  /**
   * Get the current tile URL (with API key substituted if needed)
   */
  getTileUrl(): string {
    if (!this.selectedProvider) return DEFAULT_TILE_URL;

    let url = this.selectedProvider.url_template;

    // Substitute API key if required
    if (this.selectedProvider.requires_api_key && this.apiKey) {
      url = url.replace('{apikey}', this.apiKey);
    }

    return url;
  }

  /**
   * Get attribution for current provider
   */
  getAttribution(): string {
    return this.selectedProvider?.attribution ?? DEFAULT_ATTRIBUTION;
  }

  /**
   * Get max zoom for current provider
   */
  getMaxZoom(): number {
    return this.selectedProvider?.max_zoom ?? 18;
  }

  /**
   * Check if current provider is cycling-optimized
   */
  isCyclingOptimized(): boolean {
    return this.selectedProvider?.is_cycling_optimized ?? false;
  }

  /**
   * Select a tile provider
   */
  selectProvider(providerName: string): void {
    const provider = this.providers.find((p) => p.name === providerName);
    if (!provider) {
      console.warn(`Provider "${providerName}" not found`);
      return;
    }

    // Check if API key is required but not available
    if (provider.requires_api_key && !this.apiKey) {
      console.warn(`Provider "${providerName}" requires an API key`);
      // Fall back to OSM
      this.selectedProvider =
        this.providers.find((p) => !p.requires_api_key) ?? provider;
    } else {
      this.selectedProvider = provider;
    }

    // Persist selection
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PROVIDER, this.selectedProvider.name);
    }
  }

  /**
   * Set the Thunderforest API key
   */
  setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;

    if (typeof window !== 'undefined') {
      if (apiKey) {
        localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
    }
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Check if a provider can be used (has API key if required)
   */
  isProviderAvailable(providerName: string): boolean {
    const provider = this.providers.find((p) => p.name === providerName);
    if (!provider) return false;
    if (!provider.requires_api_key) return true;
    return this.hasApiKey();
  }

  /**
   * Get fallback provider (OSM) for when selected provider is unavailable
   */
  getFallbackProvider(): MapTileProvider | null {
    return (
      this.providers.find((p) => p.name === 'osm') ??
      this.providers.find((p) => !p.requires_api_key) ??
      null
    );
  }

  /**
   * Reset to default provider (OSM)
   */
  resetToDefault(): void {
    const osm = this.providers.find((p) => p.name === 'osm');
    if (osm) {
      this.selectedProvider = osm;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PROVIDER, osm.name);
      }
    }
  }
}

/**
 * Create a TileProviderService instance
 */
export function createTileProviderService(
  supabase: SupabaseClient
): TileProviderService {
  return new TileProviderService(supabase);
}
