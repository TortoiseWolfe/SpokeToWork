'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import CompanyForm from '@/components/organisms/CompanyForm';
import CompanyTable from '@/components/organisms/CompanyTable';
import CompanyDetailDrawer from '@/components/organisms/CompanyDetailDrawer';
import ApplicationForm from '@/components/organisms/ApplicationForm';
import HomeLocationSettings from '@/components/organisms/HomeLocationSettings';
import CompanyImport from '@/components/organisms/CompanyImport';
import CompanyExport from '@/components/molecular/CompanyExport';
import type { ExportFormat } from '@/components/molecular/CompanyExport';
import { CompanyService } from '@/lib/companies/company-service';
import { ApplicationService } from '@/lib/companies/application-service';
import { supabase } from '@/lib/supabase/client';
import type {
  Company,
  CompanyWithApplications,
  CompanyCreate,
  CompanyUpdate,
  HomeLocation,
  ApplicationStatus,
  ImportResult,
  JobApplication,
  JobApplicationCreate,
  JobApplicationUpdate,
  JobApplicationStatus,
  ApplicationOutcome,
} from '@/types/company';

export default function CompaniesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [companies, setCompanies] = useState<CompanyWithApplications[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyWithApplications | null>(null);
  const [addingAppForCompany, setAddingAppForCompany] =
    useState<CompanyWithApplications | null>(null);
  const [editingApplication, setEditingApplication] =
    useState<JobApplication | null>(null);
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

  // Load companies with application data
  const loadCompanies = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingCompanies(true);
      const service = new CompanyService(supabase);
      await service.initialize(user.id);
      const data = await service.getAllWithLatestApplication();
      setCompanies(data);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isLoadingProfile) {
      loadCompanies();
    }
  }, [user, isLoadingProfile, loadCompanies]);

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
      } catch (err) {
        console.error('Error saving home location:', err);
        throw err;
      }
    },
    [user]
  );

  const handleAddCompany = useCallback(
    async (data: CompanyCreate | CompanyUpdate) => {
      if (!user) return;

      try {
        setError(null);
        const service = new CompanyService(supabase);
        await service.initialize(user.id);

        await service.create(data as CompanyCreate);

        setShowAddForm(false);
        await loadCompanies();
      } catch (err) {
        console.error('Error adding company:', err);
        setError(err instanceof Error ? err.message : 'Failed to add company');
        throw err;
      }
    },
    [user, loadCompanies]
  );

  const handleEditCompany = useCallback(
    async (data: CompanyCreate | CompanyUpdate) => {
      if (!user || !editingCompany) return;

      try {
        setError(null);
        const service = new CompanyService(supabase);
        await service.initialize(user.id);

        await service.update({
          id: editingCompany.id,
          ...data,
        } as CompanyUpdate);

        setEditingCompany(null);
        await loadCompanies();
      } catch (err) {
        console.error('Error updating company:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update company'
        );
        throw err;
      }
    },
    [user, editingCompany, loadCompanies]
  );

  const handleDeleteCompany = useCallback(
    async (company: Company | CompanyWithApplications) => {
      if (!user) return;

      if (
        !window.confirm(`Are you sure you want to delete "${company.name}"?`)
      ) {
        return;
      }

      try {
        setError(null);
        const service = new CompanyService(supabase);
        await service.initialize(user.id);

        await service.delete(company.id);
        // Close drawer if deleting the selected company
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(null);
        }
        await loadCompanies();
      } catch (err) {
        console.error('Error deleting company:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to delete company'
        );
      }
    },
    [user, loadCompanies, selectedCompany]
  );

  const handleStatusChange = useCallback(
    async (company: Company, status: ApplicationStatus) => {
      if (!user) return;

      try {
        setError(null);
        const service = new CompanyService(supabase);
        await service.initialize(user.id);

        await service.update({ id: company.id, status });
        await loadCompanies();
      } catch (err) {
        console.error('Error updating status:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update status'
        );
      }
    },
    [user, loadCompanies]
  );

  const handleCompanyClick = useCallback(
    (company: Company | CompanyWithApplications) => {
      // Open the detail drawer for this company
      const companyWithApps = companies.find((c) => c.id === company.id);
      if (companyWithApps) {
        setSelectedCompany(companyWithApps);
      }
      setShowAddForm(false);
      setShowSettings(false);
      setShowImport(false);
    },
    [companies]
  );

  const handleEditFromTable = useCallback(
    (company: Company | CompanyWithApplications) => {
      // Extract base Company for the form (strip application data)
      const baseCompany: Company = {
        id: company.id,
        user_id: company.user_id,
        name: company.name,
        address: company.address,
        latitude: company.latitude,
        longitude: company.longitude,
        website: company.website,
        email: company.email,
        phone: company.phone,
        contact_name: company.contact_name,
        contact_title: company.contact_title,
        notes: company.notes,
        status: company.status,
        priority: company.priority,
        follow_up_date: company.follow_up_date,
        is_active: company.is_active,
        extended_range: company.extended_range,
        route_id: company.route_id,
        created_at: company.created_at,
        updated_at: company.updated_at,
      };
      setEditingCompany(baseCompany);
      setSelectedCompany(null);
      setShowAddForm(false);
      setShowSettings(false);
      setShowImport(false);
    },
    []
  );

  const handleImport = useCallback(
    async (file: File): Promise<ImportResult> => {
      if (!user) throw new Error('Not authenticated');

      const service = new CompanyService(supabase);
      await service.initialize(user.id);

      const result = await service.importFromCSV(file);
      await loadCompanies();
      return result;
    },
    [user, loadCompanies]
  );

  const handleExport = useCallback(
    async (format: ExportFormat): Promise<Blob> => {
      if (!user) throw new Error('Not authenticated');

      const service = new CompanyService(supabase);
      await service.initialize(user.id);

      switch (format) {
        case 'csv':
          return service.exportToCSV();
        case 'json':
          return service.exportToJSON();
        case 'gpx':
          return service.exportToGPX();
        case 'printable':
          return service.exportToPrintable();
        default:
          throw new Error(`Unknown format: ${format}`);
      }
    },
    [user]
  );

  // Application handlers
  const handleAddApplication = useCallback(
    (company: CompanyWithApplications) => {
      setAddingAppForCompany(company);
      setEditingApplication(null);
    },
    []
  );

  const handleEditApplication = useCallback((application: JobApplication) => {
    setEditingApplication(application);
    setAddingAppForCompany(null);
  }, []);

  const handleSaveApplication = useCallback(
    async (data: JobApplicationCreate | JobApplicationUpdate) => {
      if (!user) return;

      try {
        setError(null);
        const service = new ApplicationService(supabase);
        await service.initialize(user.id);

        if (editingApplication) {
          // Update existing application
          await service.update({
            id: editingApplication.id,
            ...data,
          } as JobApplicationUpdate);
        } else if (addingAppForCompany) {
          // Create new application
          await service.create({
            ...data,
            company_id: addingAppForCompany.id,
          } as JobApplicationCreate);
        }

        // Reset state and reload
        setEditingApplication(null);
        setAddingAppForCompany(null);
        await loadCompanies();

        // Refresh selected company data
        if (selectedCompany) {
          const companyService = new CompanyService(supabase);
          await companyService.initialize(user.id);
          const updatedCompanies =
            await companyService.getAllWithLatestApplication();
          const updated = updatedCompanies.find(
            (c: CompanyWithApplications) => c.id === selectedCompany.id
          );
          if (updated) {
            setSelectedCompany(updated);
          }
        }
      } catch (err) {
        console.error('Error saving application:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to save application'
        );
        throw err;
      }
    },
    [
      user,
      editingApplication,
      addingAppForCompany,
      selectedCompany,
      loadCompanies,
    ]
  );

  const handleDeleteApplication = useCallback(
    async (application: JobApplication) => {
      if (!user) return;

      if (
        !window.confirm(
          `Are you sure you want to delete the application for "${application.position_title || 'Untitled Position'}"?`
        )
      ) {
        return;
      }

      try {
        setError(null);
        const service = new ApplicationService(supabase);
        await service.initialize(user.id);
        await service.delete(application.id);
        await loadCompanies();

        // Refresh selected company data
        if (selectedCompany) {
          const companyService = new CompanyService(supabase);
          await companyService.initialize(user.id);
          const updatedCompanies =
            await companyService.getAllWithLatestApplication();
          const updated = updatedCompanies.find(
            (c: CompanyWithApplications) => c.id === selectedCompany.id
          );
          if (updated) {
            setSelectedCompany(updated);
          }
        }
      } catch (err) {
        console.error('Error deleting application:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to delete application'
        );
      }
    },
    [user, selectedCompany, loadCompanies]
  );

  const handleApplicationStatusChange = useCallback(
    async (application: JobApplication, status: JobApplicationStatus) => {
      if (!user) return;

      try {
        setError(null);
        const service = new ApplicationService(supabase);
        await service.initialize(user.id);
        await service.update({ id: application.id, status });
        await loadCompanies();

        // Refresh selected company data
        if (selectedCompany) {
          const companyService = new CompanyService(supabase);
          await companyService.initialize(user.id);
          const updatedCompanies =
            await companyService.getAllWithLatestApplication();
          const updated = updatedCompanies.find(
            (c: CompanyWithApplications) => c.id === selectedCompany.id
          );
          if (updated) {
            setSelectedCompany(updated);
          }
        }
      } catch (err) {
        console.error('Error updating application status:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update status'
        );
      }
    },
    [user, selectedCompany, loadCompanies]
  );

  const handleApplicationOutcomeChange = useCallback(
    async (application: JobApplication, outcome: ApplicationOutcome) => {
      if (!user) return;

      try {
        setError(null);
        const service = new ApplicationService(supabase);
        await service.initialize(user.id);
        await service.update({ id: application.id, outcome });
        await loadCompanies();

        // Refresh selected company data
        if (selectedCompany) {
          const companyService = new CompanyService(supabase);
          await companyService.initialize(user.id);
          const updatedCompanies =
            await companyService.getAllWithLatestApplication();
          const updated = updatedCompanies.find(
            (c: CompanyWithApplications) => c.id === selectedCompany.id
          );
          if (updated) {
            setSelectedCompany(updated);
          }
        }
      } catch (err) {
        console.error('Error updating application outcome:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update outcome'
        );
      }
    },
    [user, selectedCompany, loadCompanies]
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
      {editingCompany && (
        <div className="mb-8">
          <CompanyForm
            company={editingCompany}
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
        onAddApplication={handleAddApplication}
        onEditApplication={handleEditApplication}
        onDeleteApplication={handleDeleteApplication}
        onStatusChange={handleApplicationStatusChange}
        onOutcomeChange={handleApplicationOutcomeChange}
      />

      {/* Application Form Modal */}
      {(addingAppForCompany || editingApplication) && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="text-lg font-bold">
              {editingApplication ? 'Edit Application' : 'Add Application'}
            </h3>
            <p className="text-base-content/70 mb-4 text-sm">
              {addingAppForCompany
                ? `Adding application for ${addingAppForCompany.name}`
                : editingApplication
                  ? `Editing ${editingApplication.position_title || 'application'}`
                  : ''}
            </p>
            <ApplicationForm
              application={editingApplication || undefined}
              companyId={
                addingAppForCompany?.id || editingApplication?.company_id || ''
              }
              onSubmit={handleSaveApplication}
              onCancel={() => {
                setAddingAppForCompany(null);
                setEditingApplication(null);
              }}
            />
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setAddingAppForCompany(null);
              setEditingApplication(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
