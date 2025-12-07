'use client';

/**
 * Companies Page - Multi-Tenant Version
 *
 * Uses the unified company view that combines:
 * - Shared companies the user is tracking (via user_company_tracking)
 * - Private companies the user has created
 *
 * @see src/hooks/useCompanies.ts
 * @see src/lib/companies/multi-tenant-service.ts
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useCompanies } from '@/hooks/useCompanies';
import CompanyForm from '@/components/organisms/CompanyForm';
import CompanyTable from '@/components/organisms/CompanyTable';
import CompanyDetailDrawer from '@/components/organisms/CompanyDetailDrawer';
import HomeLocationSettings from '@/components/organisms/HomeLocationSettings';
import CompanyImport from '@/components/organisms/CompanyImport';
import CompanyExport from '@/components/molecular/CompanyExport';
import type { ExportFormat } from '@/components/molecular/CompanyExport';
import { supabase } from '@/lib/supabase/client';
import type {
  UnifiedCompany,
  Company,
  CompanyWithApplications,
  CompanyCreate,
  CompanyUpdate,
  HomeLocation,
  CompanyStatus,
  ImportResult,
  PrivateCompanyCreate,
} from '@/types/company';

/** Type alias for company types used in this page */
type CompanyType = Company | CompanyWithApplications | UnifiedCompany;

/**
 * Type guard to check if company is from unified view (Feature 012)
 */
function isUnifiedCompany(company: CompanyType): company is UnifiedCompany {
  return (
    'source' in company &&
    ('tracking_id' in company || 'private_company_id' in company)
  );
}

/**
 * Get the unique identifier for a unified company
 * Returns tracking_id for shared companies, private_company_id for private
 */
function getCompanyId(company: UnifiedCompany): string {
  if (company.source === 'shared' && company.tracking_id) {
    return company.tracking_id;
  }
  if (company.source === 'private' && company.private_company_id) {
    return company.private_company_id;
  }
  throw new Error('Invalid company: missing identifier');
}

/**
 * Convert UnifiedCompany to legacy format for components that haven't been updated yet
 */
function toCompanyWithApplications(
  company: UnifiedCompany
): CompanyWithApplications {
  const id = getCompanyId(company);
  return {
    id,
    user_id: company.user_id,
    name: company.name,
    address: company.address,
    latitude: company.latitude ?? 0,
    longitude: company.longitude ?? 0,
    website: company.website,
    careers_url: company.careers_url,
    email: company.email,
    phone: company.phone,
    contact_name: company.contact_name,
    contact_title: company.contact_title,
    notes: company.notes,
    status: company.status,
    priority: company.priority,
    follow_up_date: company.follow_up_date,
    is_active: company.is_active,
    extended_range: false, // Not in unified view
    route_id: null, // Not in unified view
    created_at: company.created_at,
    updated_at: company.updated_at,
    applications: [],
    latest_application: null,
    total_applications: 0,
  };
}

export default function CompaniesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Use the multi-tenant companies hook
  const {
    companies: unifiedCompanies,
    isLoading: isLoadingCompanies,
    error: companiesError,
    refetch,
    createPrivate,
    updatePrivate,
    deletePrivate,
    updateTracking,
    stopTracking,
  } = useCompanies();

  // Convert to legacy format for existing components
  const companies = unifiedCompanies.map(toCompanyWithApplications);

  // State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCompany, setEditingCompany] = useState<UnifiedCompany | null>(
    null
  );
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyWithApplications | null>(null);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Load user's home location from profile
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(
            'home_address, home_latitude, home_longitude, distance_radius_miles'
          )
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data?.home_address && data?.home_latitude && data?.home_longitude) {
          setHomeLocation({
            address: data.home_address,
            latitude: data.home_latitude,
            longitude: data.home_longitude,
            radius_miles: data.distance_radius_miles || 20,
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user]);

  // Set error from hook
  useEffect(() => {
    if (companiesError) {
      setError(companiesError.message);
    }
  }, [companiesError]);

  const handleSaveHomeLocation = useCallback(
    async (location: HomeLocation) => {
      if (!user) return;

      try {
        const { error } = await supabase.from('user_profiles').upsert({
          id: user.id,
          home_address: location.address,
          home_latitude: location.latitude,
          home_longitude: location.longitude,
          distance_radius_miles: location.radius_miles,
        });

        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw new Error(error.message || 'Failed to save home location');
        }

        setHomeLocation(location);
        setShowSettings(false);
        // Refetch companies as metro area may have changed
        await refetch();
      } catch (err) {
        console.error('Error saving home location:', err);
        throw err;
      }
    },
    [user, refetch]
  );

  const handleAddCompany = useCallback(
    async (data: CompanyCreate | CompanyUpdate) => {
      if (!user) return;

      try {
        setError(null);

        // Create as private company
        const privateData: PrivateCompanyCreate = {
          name: data.name ?? '',
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          website: data.website ?? undefined,
          careers_url: data.careers_url ?? undefined,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          contact_name: data.contact_name ?? undefined,
          contact_title: data.contact_title ?? undefined,
          notes: data.notes ?? undefined,
          status: data.status,
          priority: data.priority,
        };

        await createPrivate(privateData);
        setShowAddForm(false);
      } catch (err) {
        console.error('Error adding company:', err);
        setError(err instanceof Error ? err.message : 'Failed to add company');
        throw err;
      }
    },
    [user, createPrivate]
  );

  const handleEditCompany = useCallback(
    async (data: CompanyCreate | CompanyUpdate) => {
      if (!user || !editingCompany) return;

      try {
        setError(null);

        if (
          editingCompany.source === 'private' &&
          editingCompany.private_company_id
        ) {
          // Update private company
          await updatePrivate({
            id: editingCompany.private_company_id,
            name: data.name,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            website: data.website ?? null,
            careers_url: data.careers_url ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            contact_name: data.contact_name ?? null,
            contact_title: data.contact_title ?? null,
            notes: data.notes ?? null,
            status: data.status,
            priority: data.priority,
          });
        } else if (
          editingCompany.source === 'shared' &&
          editingCompany.tracking_id
        ) {
          // Update tracking record (limited fields)
          await updateTracking({
            id: editingCompany.tracking_id,
            status: data.status,
            priority: data.priority,
            notes: data.notes ?? null,
            contact_name: data.contact_name ?? null,
            contact_title: data.contact_title ?? null,
          });
        }

        setEditingCompany(null);
      } catch (err) {
        console.error('Error updating company:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update company'
        );
        throw err;
      }
    },
    [user, editingCompany, updatePrivate, updateTracking]
  );

  const handleDeleteCompany = useCallback(
    async (company: CompanyType) => {
      if (!user) return;

      if (
        !window.confirm(`Are you sure you want to delete "${company.name}"?`)
      ) {
        return;
      }

      try {
        setError(null);

        // Get company ID
        const companyId = isUnifiedCompany(company)
          ? getCompanyId(company)
          : company.id;

        // Find the unified company
        const unified = unifiedCompanies.find(
          (c) => getCompanyId(c) === companyId
        );

        if (!unified) {
          throw new Error('Company not found');
        }

        if (unified.source === 'private' && unified.private_company_id) {
          await deletePrivate(unified.private_company_id);
        } else if (unified.source === 'shared' && unified.tracking_id) {
          // For shared companies, stop tracking instead of deleting
          await stopTracking(unified.tracking_id);
        }

        // Close drawer if deleting the selected company
        if (selectedCompany?.id === companyId) {
          setSelectedCompany(null);
        }
      } catch (err) {
        console.error('Error deleting company:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to delete company'
        );
      }
    },
    [user, unifiedCompanies, deletePrivate, stopTracking, selectedCompany]
  );

  const handleStatusChange = useCallback(
    async (company: Company, status: CompanyStatus) => {
      if (!user) return;

      try {
        setError(null);

        // Find the unified company
        const unified = unifiedCompanies.find(
          (c) => getCompanyId(c) === company.id
        );

        if (!unified) {
          throw new Error('Company not found');
        }

        if (unified.source === 'private' && unified.private_company_id) {
          await updatePrivate({
            id: unified.private_company_id,
            status,
          });
        } else if (unified.source === 'shared' && unified.tracking_id) {
          await updateTracking({
            id: unified.tracking_id,
            status,
          });
        }
      } catch (err) {
        console.error('Error updating status:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update status'
        );
      }
    },
    [user, unifiedCompanies, updatePrivate, updateTracking]
  );

  const handleCompanyClick = useCallback(
    (company: CompanyType) => {
      // Convert to CompanyWithApplications for the drawer
      const companyId = isUnifiedCompany(company)
        ? getCompanyId(company)
        : company.id;
      const found = companies.find((c) => c.id === companyId);
      if (found) {
        setSelectedCompany(found);
      }
      setShowAddForm(false);
      setShowSettings(false);
      setShowImport(false);
    },
    [companies]
  );

  const handleEditFromTable = useCallback(
    (company: CompanyType) => {
      // Get the company ID
      const companyId = isUnifiedCompany(company)
        ? getCompanyId(company)
        : company.id;

      // Find the unified company for editing
      const unified = unifiedCompanies.find(
        (c) => getCompanyId(c) === companyId
      );

      if (unified) {
        setEditingCompany(unified);
        setSelectedCompany(null);
        setShowAddForm(false);
        setShowSettings(false);
        setShowImport(false);
      }
    },
    [unifiedCompanies]
  );

  const handleImport = useCallback(
    async (file: File): Promise<ImportResult> => {
      if (!user) throw new Error('Not authenticated');

      // CSV import temporarily disabled - multi-tenant schema requires importing
      // companies as private first, then optionally contributing to shared registry
      return {
        success: 0,
        failed: 0,
        errors: [
          {
            row: 0,
            reason:
              'CSV import temporarily disabled during multi-tenant migration',
          },
        ],
      };
    },
    [user]
  );

  const handleExport = useCallback(
    async (format: ExportFormat): Promise<Blob> => {
      if (!user) throw new Error('Not authenticated');

      // Export from unified companies
      const exportData = unifiedCompanies.map((c) => ({
        name: c.name,
        address: c.address,
        latitude: c.latitude,
        longitude: c.longitude,
        website: c.website,
        phone: c.phone,
        email: c.email,
        contact_name: c.contact_name,
        status: c.status,
        priority: c.priority,
        notes: c.notes,
        source: c.source,
        is_verified: c.is_verified,
      }));

      switch (format) {
        case 'csv': {
          if (exportData.length === 0) {
            return new Blob(['No companies to export'], { type: 'text/csv' });
          }
          const headers = Object.keys(exportData[0]).join(',');
          const rows = exportData.map((row) =>
            Object.values(row)
              .map((v) =>
                v === null ? '' : `"${String(v).replace(/"/g, '""')}"`
              )
              .join(',')
          );
          const csv = [headers, ...rows].join('\n');
          return new Blob([csv], { type: 'text/csv' });
        }
        case 'json': {
          const json = JSON.stringify(exportData, null, 2);
          return new Blob([json], { type: 'application/json' });
        }
        case 'gpx': {
          const waypoints = exportData
            .filter((c) => c.latitude && c.longitude)
            .map(
              (c) => `  <wpt lat="${c.latitude}" lon="${c.longitude}">
    <name>${escapeXML(c.name)}</name>
    <desc>${escapeXML(c.address || '')}</desc>
  </wpt>`
            );
          const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SpokeToWork">
${waypoints.join('\n')}
</gpx>`;
          return new Blob([gpx], { type: 'application/gpx+xml' });
        }
        case 'printable': {
          const statusLabels: Record<string, string> = {
            not_contacted: 'Not Contacted',
            contacted: 'Contacted',
            follow_up: 'Follow Up',
            meeting: 'Meeting',
            outcome_positive: 'Positive',
            outcome_negative: 'Negative',
          };
          const rows = exportData
            .map(
              (c) => `    <tr>
      <td>${escapeXML(c.name)}</td>
      <td>${escapeXML(c.address || '-')}</td>
      <td>${escapeXML(c.contact_name || '-')}</td>
      <td>${escapeXML(c.phone || '-')}</td>
      <td>${statusLabels[c.status] || c.status}</td>
      <td>${c.priority}</td>
    </tr>`
            )
            .join('\n');
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Companies List</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Companies List</h1>
  <p>Generated: ${new Date().toLocaleDateString()}</p>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Address</th>
        <th>Contact</th>
        <th>Phone</th>
        <th>Status</th>
        <th>Priority</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>`;
          return new Blob([html], { type: 'text/html' });
        }
        default:
          throw new Error(`Unknown format: ${format}`);
      }
    },
    [user, unifiedCompanies]
  );

  // Loading state
  if (authLoading || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  const showingForm = showAddForm || editingCompany || showImport;

  // Convert editing company to legacy format for form
  const editingCompanyLegacy = editingCompany
    ? toCompanyWithApplications(editingCompany)
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-base-content/70">
            Track companies for your job search
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowAddForm(false);
              setEditingCompany(null);
              setShowImport(false);
            }}
          >
            {showSettings ? 'Hide Settings' : 'Home Location'}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setShowImport(!showImport);
              setShowAddForm(false);
              setEditingCompany(null);
              setShowSettings(false);
            }}
          >
            {showImport ? 'Cancel Import' : 'Import CSV'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingCompany(null);
              setShowSettings(false);
              setShowImport(false);
            }}
          >
            {showAddForm ? 'Cancel' : 'Add Company'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Home Location Prompt */}
      {!homeLocation && !showSettings && !showingForm && (
        <div className="alert alert-info mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="h-6 w-6 shrink-0 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Set your home location to enable distance calculations and extended
            range warnings.
          </span>
          <button className="btn btn-sm" onClick={() => setShowSettings(true)}>
            Set Location
          </button>
        </div>
      )}

      {/* Home Location Settings */}
      {showSettings && (
        <div className="mb-8">
          <HomeLocationSettings
            initialLocation={homeLocation}
            onSave={handleSaveHomeLocation}
          />
        </div>
      )}

      {/* Add Company Form */}
      {showAddForm && (
        <div className="mb-8">
          <CompanyForm
            homeLocation={homeLocation}
            onSubmit={handleAddCompany}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Edit Company Form */}
      {editingCompany && editingCompanyLegacy && (
        <div className="mb-8">
          <CompanyForm
            company={editingCompanyLegacy}
            homeLocation={homeLocation}
            onSubmit={handleEditCompany}
            onCancel={() => setEditingCompany(null)}
          />
        </div>
      )}

      {/* Import Companies */}
      {showImport && (
        <div className="mb-8">
          <CompanyImport
            onImport={handleImport}
            onCancel={() => setShowImport(false)}
            onComplete={() => {
              // Keep the import dialog open to show results
            }}
          />
        </div>
      )}

      {/* Company Table */}
      {!showingForm && !showSettings && (
        <>
          {/* Export Options */}
          <div className="mb-4 flex justify-end">
            <CompanyExport
              onExport={handleExport}
              companyCount={companies.length}
              disabled={isLoadingCompanies}
            />
          </div>

          <CompanyTable
            companies={companies}
            isLoading={isLoadingCompanies}
            onCompanyClick={handleCompanyClick}
            onEdit={handleEditFromTable}
            onDelete={handleDeleteCompany}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {/* Company Detail Drawer */}
      <CompanyDetailDrawer
        company={selectedCompany}
        isOpen={selectedCompany !== null}
        onClose={() => setSelectedCompany(null)}
        onEditCompany={(company) => {
          handleEditFromTable(company);
        }}
      />
    </div>
  );
}

/**
 * Escape XML special characters
 */
function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
