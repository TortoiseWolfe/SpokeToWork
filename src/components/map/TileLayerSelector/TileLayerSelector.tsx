'use client';

/**
 * TileLayerSelector - Feature 041: Bicycle Route Planning
 *
 * Dropdown component for selecting map tile providers.
 * Shows available providers with cycling-optimized indicators.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import type { MapTileProvider } from '@/types/route';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';

export interface TileLayerSelectorProps {
  /** Available tile providers */
  providers: MapTileProvider[];
  /** Currently selected provider */
  selected: MapTileProvider | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when provider is selected */
  onSelect: (providerName: string) => void;
  /** Check if provider is available (has required API key, etc.) */
  isProviderAvailable?: (providerName: string) => boolean;
  /** Whether user has configured an API key */
  hasApiKey?: boolean;
  /** Callback to reset to default provider */
  onReset?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export default function TileLayerSelector({
  providers,
  selected,
  isLoading = false,
  onSelect,
  isProviderAvailable,
  hasApiKey = false,
  onReset,
  className = '',
}: TileLayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // FR-007: Use unified click-outside hook
  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (providerName: string) => {
    onSelect(providerName);
    setIsOpen(false);
  };

  const checkAvailability = (provider: MapTileProvider): boolean => {
    if (!provider.requires_api_key) return true;
    if (isProviderAvailable) return isProviderAvailable(provider.name);
    return hasApiKey;
  };

  // Filter to enabled providers only
  const enabledProviders = providers.filter((p) => p.is_enabled);

  const disabledProviderIndices = useMemo(
    () =>
      enabledProviders
        .map((p, i) => (!checkAvailability(p) ? i : -1))
        .filter((i) => i !== -1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledProviders, hasApiKey, isProviderAvailable]
  );

  const selectedIndex = enabledProviders.findIndex(
    (p) => p.name === selected?.name
  );

  const { getItemProps: getOptionProps } = useRovingTabIndex({
    itemCount: enabledProviders.length,
    orientation: 'vertical',
    initialIndex: selectedIndex >= 0 ? selectedIndex : 0,
    disabledIndices: disabledProviderIndices,
    onActiveIndexChange: (index) => {
      // Focus moves but selection only happens on Enter/click
    },
  });

  return (
    <div
      ref={dropdownRef}
      className={`dropdown dropdown-end ${isOpen ? 'dropdown-open' : ''} ${className}`}
      data-testid="tile-layer-selector"
    >
      {/* Trigger button */}
      <button
        type="button"
        className="btn btn-sm btn-ghost gap-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select map tile provider"
        disabled={isLoading}
      >
        {isLoading ? (
          <span
            className="loading loading-spinner loading-xs"
            aria-hidden="true"
          />
        ) : (
          <>
            {/* Map icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span className="hidden sm:inline">
              {selected?.display_name ?? 'Map Style'}
            </span>
            {selected?.is_cycling_optimized && (
              <span
                className="badge badge-xs badge-primary"
                aria-label="Cycling optimized"
              >
                🚴
              </span>
            )}
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="dropdown-content bg-base-100 rounded-box z-[1000] w-56 p-2 shadow-lg"
          role="listbox"
          aria-label="Map tile providers"
        >
          {enabledProviders.length === 0 ? (
            <div className="text-base-content/80 p-2 text-sm">
              No providers available
            </div>
          ) : (
            enabledProviders.map((provider, index) => {
              const isAvailable = checkAvailability(provider);
              const isSelected = selected?.name === provider.name;
              const rovingProps = getOptionProps(index);

              return (
                <div
                  key={provider.name}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!isAvailable}
                  className={`hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded p-2 ${
                    isSelected ? 'bg-primary/10' : ''
                  } ${!isAvailable ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={() => isAvailable && handleSelect(provider.name)}
                  {...rovingProps}
                  onKeyDown={(e) => {
                    // Roving tabindex handles arrow/Home/End keys
                    rovingProps.onKeyDown(e);
                    // Enter/Space selects the option
                    if ((e.key === 'Enter' || e.key === ' ') && isAvailable) {
                      e.preventDefault();
                      handleSelect(provider.name);
                    }
                  }}
                >
                  {/* Provider name */}
                  <span className="flex-1">{provider.display_name}</span>

                  {/* Cycling optimized indicator */}
                  {provider.is_cycling_optimized && (
                    <span
                      className="badge badge-xs badge-primary"
                      title="Cycling optimized"
                      aria-label="Cycling optimized"
                    >
                      🚴
                    </span>
                  )}

                  {/* Requires API key indicator */}
                  {provider.requires_api_key && !hasApiKey && (
                    <span
                      className="badge badge-xs badge-warning"
                      title="Requires API key"
                      aria-label="Requires API key"
                    >
                      🔑
                    </span>
                  )}

                  {/* Selected checkmark */}
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              );
            })
          )}

          {/* Reset option */}
          {onReset && selected && (
            <>
              <div className="divider my-1" />
              <button
                type="button"
                className="text-base-content/85 hover:bg-base-200 w-full rounded p-2 text-left text-sm"
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
              >
                Reset to default
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
