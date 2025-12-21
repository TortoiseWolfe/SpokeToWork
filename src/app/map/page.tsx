'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/contexts/AuthContext';
import { useRoutes } from '@/hooks/useRoutes';
import { useUserProfile } from '@/hooks/useUserProfile';
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
      <div className="bg-base-200 flex h-full items-center justify-center">
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

  // Get user's home location for route start/end markers
  const { profile } = useUserProfile();

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
  const baseRoutes = user ? routes : systemRoutes;

  // Extend user route geometries to connect to home location
  // This ensures the polyline visually connects to the home marker
  const displayRoutes = useMemo(() => {
    if (!profile?.home_latitude || !profile?.home_longitude) {
      return baseRoutes;
    }

    return baseRoutes.map((route) => {
      // Only modify user routes (not system routes) with existing geometry
      if (route.is_system_route || !route.route_geometry) {
        return route;
      }

      const geometry = route.route_geometry;
      // profile.home_longitude/latitude are guaranteed non-null by the useMemo guard above
      const homeCoord: [number, number] = [
        profile.home_longitude!,
        profile.home_latitude!,
      ]; // GeoJSON is [lng, lat]

      // Prepend home coordinate to the route geometry
      if (
        geometry.type === 'LineString' &&
        Array.isArray(geometry.coordinates)
      ) {
        const firstCoord = geometry.coordinates[0] as [number, number];
        // Check if already starts at home (within ~10 meters)
        const alreadyAtHome =
          Math.abs(firstCoord[0] - homeCoord[0]) < 0.0001 &&
          Math.abs(firstCoord[1] - homeCoord[1]) < 0.0001;

        if (!alreadyAtHome) {
          return {
            ...route,
            route_geometry: {
              ...geometry,
              coordinates: [
                homeCoord,
                ...(geometry.coordinates as [number, number][]),
              ],
            },
          } as typeof route;
        }
      }

      return route;
    });
  }, [baseRoutes, profile?.home_latitude, profile?.home_longitude]);

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

  // Convert route companies to map markers - ONLY for the active route
  const companyMarkers: MapMarker[] = useMemo(() => {
    if (!activeRouteId) return [];

    return routeCompanies
      .filter(
        (rc) =>
          rc.route_id === activeRouteId && // Only show companies for active route
          rc.company.latitude &&
          rc.company.longitude
      )
      .map((rc) => ({
        id: `company-${rc.id}`,
        position: [rc.company.latitude!, rc.company.longitude!] as Position,
        popup: `${rc.company.name}${rc.visit_on_next_ride ? ' 🚴 Next Ride' : ''}`,
        variant: rc.visit_on_next_ride
          ? ('next-ride' as const)
          : ('active-route' as const),
      }));
  }, [routeCompanies, activeRouteId]);

  // Create HOME location marker for active route (Feature 046/047)
  // For USER routes: show user's home location as start/end point
  // For SYSTEM routes (trails): show the trail's start/end points
  const routeEndpointMarkers: MapMarker[] = useMemo(() => {
    if (!activeRouteId) return [];

    const activeRoute = displayRoutes.find((r) => r.id === activeRouteId);
    if (!activeRoute) return [];

    const markers: MapMarker[] = [];

    // For USER routes (non-system): use user's home location
    if (
      !activeRoute.is_system_route &&
      profile?.home_latitude &&
      profile?.home_longitude
    ) {
      markers.push({
        id: `home-${activeRoute.id}`,
        position: [profile.home_latitude, profile.home_longitude] as Position,
        popup: profile.home_address || 'Home',
        variant: 'start-point' as const,
      });

      logger.info('Home marker created for user route', {
        activeRouteId,
        routeName: activeRoute.name,
        homeAddress: profile.home_address,
        lat: profile.home_latitude,
        lng: profile.home_longitude,
      });
    }
    // For SYSTEM routes (trails): use the route's start/end coordinates
    else if (activeRoute.is_system_route) {
      if (activeRoute.start_latitude && activeRoute.start_longitude) {
        markers.push({
          id: `start-${activeRoute.id}`,
          position: [
            activeRoute.start_latitude,
            activeRoute.start_longitude,
          ] as Position,
          popup: activeRoute.start_address || 'Trail Start',
          variant: 'start-point' as const,
        });
      }

      if (activeRoute.end_latitude && activeRoute.end_longitude) {
        const isSameAsStart =
          activeRoute.start_latitude === activeRoute.end_latitude &&
          activeRoute.start_longitude === activeRoute.end_longitude;

        if (!isSameAsStart) {
          markers.push({
            id: `end-${activeRoute.id}`,
            position: [
              activeRoute.end_latitude,
              activeRoute.end_longitude,
            ] as Position,
            popup: activeRoute.end_address || 'Trail End',
            variant: 'end-point' as const,
          });
        }
      }

      logger.info('Trail endpoint markers created', {
        activeRouteId,
        routeName: activeRoute.name,
        hasStart: !!activeRoute.start_latitude,
        hasEnd: !!activeRoute.end_latitude,
        markerCount: markers.length,
      });
    }

    return markers;
  }, [activeRouteId, displayRoutes, profile]);

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
    <main className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Compact toolbar */}
      <div className="bg-base-100 flex flex-wrap items-center gap-2 px-2 py-1 shadow-sm">
        <LocationButton
          onClick={handleLocationRequest}
          loading={loading}
          disabled={!isMounted || !isSupported || permission === 'denied'}
          hasLocation={!!userLocation}
          permissionState={permission}
        />

        {userLocation && (
          <span className="text-xs opacity-70">
            {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
            {accuracy && ` (±${accuracy.toFixed(0)}m)`}
          </span>
        )}

        {error && <span className="text-error text-xs">{error.message}</span>}

        <div className="flex-1" />

        <a href="/companies" className="btn btn-xs btn-ghost gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 14.647l-4.419 2.167A1 1 0 014 16V4z"
              clipRule="evenodd"
            />
          </svg>
          Companies
        </a>
      </div>

      {/* Full-height map */}
      <div className="relative flex-1">
        <MapContainer
          center={mapCenter}
          zoom={13}
          height="100%"
          width="100%"
          showUserLocation={false}
          markers={[
            ...demoMarkers,
            ...companyMarkers,
            ...routeEndpointMarkers,
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
