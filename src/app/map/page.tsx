'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/contexts/AuthContext';
import { useRoutes } from '@/hooks/useRoutes';
import { LocationButton } from '@/components/map/LocationButton';
import {
  GeolocationConsent,
  GeolocationPurpose,
} from '@/components/map/GeolocationConsent';
// Position tuple type for map coordinates [lat, lng]
type Position = [number, number];
import { createLogger } from '@/lib/logger';
import { DEFAULT_MAP_CONFIG } from '@/utils/map-utils';
import type { RouteCompanyWithDetails } from '@/types/route';
import type { MapMarker } from '@/components/map/MapContainer/MapContainerInner';

const logger = createLogger('app:map:page');

// Dynamic import for RoutePolylines to avoid SSR issues (Leaflet dependency)
// With error handling to prevent crashes if component fails to load
const RoutePolylines = dynamicImport(
  () =>
    import('@/components/map/RoutePolyline')
      .then((mod) => ({
        default: mod.RoutePolylines,
      }))
      .catch((err) => {
        console.error('Failed to load RoutePolylines:', err);
        // Return a no-op component on error
        return { default: () => null };
      }),
  {
    ssr: false,
    loading: () => null, // Loading handled by parent
  }
);

// Dynamic import for MapContainer to avoid SSR issues
const MapContainer = dynamicImport(
  () =>
    import('@/components/map/MapContainer').then((mod) => ({
      default: mod.MapContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-base-200 flex h-[600px] items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    ),
  }
);

export default function MapPage() {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [userLocation, setUserLocation] = useState<Position | null>(null);
  const [mapCenter, setMapCenter] = useState<Position>([35.175, -84.865]); // Center on Cleveland GreenWay

  // Fix hydration mismatch - only show client-side content after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Feature 041: Auth and routes for displaying route polylines
  const { user, isLoading: authLoading } = useAuth();

  // Always load routes - system routes visible to everyone
  const {
    routes,
    activeRouteId,
    isLoading: routesLoading,
    error: routesError,
    getRouteCompanies,
    getSystemRoutes,
  } = useRoutes({ skip: false });

  // Fetch system routes for unauthenticated users
  const [systemRoutes, setSystemRoutes] = useState<typeof routes>([]);

  useEffect(() => {
    if (!user && !authLoading) {
      getSystemRoutes().then(setSystemRoutes).catch(console.error);
    }
  }, [user, authLoading, getSystemRoutes]);

  // Combine routes: use all routes for logged-in users, only system routes for guests
  const displayRoutes = user ? routes : systemRoutes;

  // State for companies on routes (for displaying markers)
  const [routeCompanies, setRouteCompanies] = useState<
    RouteCompanyWithDetails[]
  >([]);

  // Log any route errors for debugging
  if (routesError) {
    logger.error('Route loading error', { error: routesError.message });
  }

  // Debug: Log routes being fetched
  useEffect(() => {
    if (!routesLoading && routes.length > 0) {
      logger.info('Routes loaded', {
        count: routes.length,
        routesWithGeometry: routes.filter((r) => r.route_geometry).length,
        routeDetails: routes.map((r) => ({
          name: r.name,
          is_system_route: r.is_system_route,
          has_geometry: !!r.route_geometry,
          color: r.color,
        })),
      });
    }
  }, [routes, routesLoading]);

  // Fetch companies for all routes with geometry
  useEffect(() => {
    async function fetchAllRouteCompanies() {
      if (routesLoading || routes.length === 0) return;

      const routesWithGeometry = routes.filter(
        (r) => r.route_geometry && !r.is_system_route
      );
      if (routesWithGeometry.length === 0) return;

      try {
        const allCompanies: RouteCompanyWithDetails[] = [];
        for (const route of routesWithGeometry) {
          const companies = await getRouteCompanies(route.id);
          allCompanies.push(...companies);
        }
        setRouteCompanies(allCompanies);
        logger.info('Route companies loaded', { count: allCompanies.length });
      } catch (err) {
        logger.error('Failed to fetch route companies', { error: err });
      }
    }

    fetchAllRouteCompanies();
  }, [routes, routesLoading, getRouteCompanies]);

  // Convert route companies to map markers
  const companyMarkers: MapMarker[] = useMemo(() => {
    return routeCompanies
      .filter((rc) => rc.company.latitude && rc.company.longitude)
      .map((rc) => ({
        id: `company-${rc.id}`,
        position: [rc.company.latitude!, rc.company.longitude!] as Position,
        popup: `${rc.company.name}${rc.visit_on_next_ride ? ' 🚴 Next Ride' : ''}`,
        variant: rc.visit_on_next_ride
          ? ('next-ride' as const)
          : ('active-route' as const),
      }));
  }, [routeCompanies]);

  const {
    position,
    permission,
    loading,
    error,
    accuracy,
    getCurrentPosition,
    isSupported,
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  });

  // Check localStorage after mount
  useEffect(() => {
    const consent = localStorage.getItem('geolocation-consent');
    if (consent) {
      try {
        const parsed = JSON.parse(consent);
        if (parsed.consentGiven === true) {
          setHasConsent(true);
        }
      } catch {
        // Invalid consent data, keep as false
      }
    }
  }, []);

  const handleLocationRequest = useCallback(() => {
    if (!hasConsent) {
      setShowConsentModal(true);
    } else {
      getCurrentPosition();
    }
  }, [hasConsent, getCurrentPosition]);

  const handleConsentAccept = useCallback(
    (purposes: GeolocationPurpose[]) => {
      // Save consent to localStorage
      const consentData = {
        consentGiven: true,
        consentDate: new Date().toISOString(),
        purposes,
        expiryDate: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(), // 1 year
      };
      localStorage.setItem('geolocation-consent', JSON.stringify(consentData));

      setHasConsent(true);
      setShowConsentModal(false);

      // Request location after consent
      getCurrentPosition();
    },
    [getCurrentPosition]
  );

  const handleConsentDecline = useCallback(() => {
    // Save rejection to localStorage
    const consentData = {
      consentGiven: false,
      consentDate: new Date().toISOString(),
      purposes: [],
    };
    localStorage.setItem('geolocation-consent', JSON.stringify(consentData));

    setHasConsent(false);
    setShowConsentModal(false);
  }, []);

  const handleLocationFound = useCallback(
    (geolocationPosition: GeolocationPosition) => {
      const newLocation: Position = [
        geolocationPosition.coords.latitude,
        geolocationPosition.coords.longitude,
      ];
      setUserLocation(newLocation);
      setMapCenter(newLocation);
    },
    []
  );

  const handleLocationError = useCallback(
    (geolocationError: GeolocationPositionError) => {
      logger.error('Location error', {
        code: geolocationError.code,
        message: geolocationError.message,
      });
    },
    []
  );

  // Update location when position changes
  React.useEffect(() => {
    if (position) {
      const newLocation: Position = [
        position.coords.latitude,
        position.coords.longitude,
      ];
      setUserLocation(newLocation);
      setMapCenter(newLocation);
    }
  }, [position]);

  // Demo markers disabled due to Leaflet icon cleanup issue
  // TODO: Re-enable once Leaflet initialization issue is fixed
  const demoMarkers: Array<{
    id: string;
    position: Position;
    popup: string;
  }> = [];

  return (
    <main className="container mx-auto p-4">
      <header className="prose mb-6 max-w-none">
        <div className="not-prose mb-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold sm:text-4xl md:text-5xl">
            Interactive Map
          </h1>
          <a href="/companies" className="btn btn-sm btn-outline gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 14.647l-4.419 2.167A1 1 0 014 16V4z"
                clipRule="evenodd"
              />
            </svg>
            Manage Companies
          </a>
        </div>
        <p>
          Explore the map and enable location services to see your current
          position.
          {isMounted && !isSupported && (
            <span className="text-error ml-2">
              (Geolocation is not supported by your browser)
            </span>
          )}
        </p>
        {/* Feature 041: Route status indicator */}
        {!routesLoading && displayRoutes.length > 0 && (
          <p className="text-primary text-sm">
            Showing {displayRoutes.filter((r) => r.route_geometry).length}{' '}
            route(s) with geometry
            {user &&
              companyMarkers.length > 0 &&
              ` • ${companyMarkers.length} company marker(s)`}
            {user && activeRouteId && ' • Active route highlighted'}
          </p>
        )}
        {user && !routesLoading && displayRoutes.length === 0 && (
          <p className="text-base-content/60 text-sm">
            No routes created yet.{' '}
            <a href="/companies" className="link link-primary">
              Create routes
            </a>{' '}
            on the Companies page.
          </p>
        )}
        {!user && !routesLoading && displayRoutes.length === 0 && (
          <p className="text-base-content/60 text-sm">
            <a href="/sign-in" className="link link-primary">
              Sign in
            </a>{' '}
            to create your own bicycle routes.
          </p>
        )}
      </header>

      <section className="card bg-base-100 shadow-xl">
        <div className="card-body p-4">
          <div className="mb-4 flex flex-wrap gap-4">
            <LocationButton
              onClick={handleLocationRequest}
              loading={loading}
              disabled={!isMounted || !isSupported || permission === 'denied'}
              hasLocation={!!userLocation}
              permissionState={permission}
            />

            {error && (
              <div className="alert alert-error">
                <span>{error.message}</span>
              </div>
            )}

            {userLocation && (
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">Your Location</div>
                  <div className="stat-value text-lg">
                    {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </div>
                  {accuracy && (
                    <div className="stat-desc">
                      Accuracy: ±{accuracy.toFixed(0)}m
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <MapContainer
              center={mapCenter}
              zoom={13}
              height="600px"
              width="100%"
              showUserLocation={false} // We'll manage location manually
              markers={[
                ...demoMarkers,
                ...companyMarkers, // Companies on routes
                ...(userLocation
                  ? [
                      {
                        id: 'user-location',
                        position: userLocation,
                        popup: `You are here (Accuracy: ±${accuracy?.toFixed(0) || 0}m)`,
                      },
                    ]
                  : []),
              ]}
              onLocationFound={handleLocationFound}
              onLocationError={handleLocationError}
              testId="map-container"
            >
              {/* Feature 041: Render route polylines - system routes for everyone, user routes when logged in */}
              {!routesError && displayRoutes.length > 0 && (
                <RoutePolylines
                  routes={displayRoutes}
                  activeRouteId={activeRouteId}
                  showSystemRoutes={true}
                  showUserRoutes={!!user}
                />
              )}
            </MapContainer>
          </div>
        </div>
      </section>

      <GeolocationConsent
        isOpen={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        onClose={() => setShowConsentModal(false)}
        title="Enable Location Services"
        description="We'd like to use your location to show you on the map and help you explore nearby places."
        privacyPolicyUrl="/privacy"
      />
    </main>
  );
}
