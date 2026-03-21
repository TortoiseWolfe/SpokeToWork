'use client';

/**
 * CompaniesToolbar — page header, panel toggles, error + home-location alerts.
 * Page-scoped (under src/app/companies/sections); not a reusable component.
 */

import type { ModalsApi } from '@/hooks/useCompaniesPageModals';
import type { HomeLocation } from '@/types/company';

export interface CompaniesToolbarProps {
  activeRouteName?: string;
  modals: ModalsApi;
  onCancelEdit: () => void;
  error: string | null;
  onDismissError: () => void;
  homeLocation: HomeLocation | null;
  /** True when *any* exclusive panel (form/edit/import/settings) is open */
  showingPanel: boolean;
}

function ToggleBtn(props: {
  active: boolean;
  primary?: boolean;
  on: string;
  off: string;
  onClick: () => void;
}) {
  const { active, primary, on, off, onClick } = props;
  return (
    <button
      className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-outline'}`}
      onClick={onClick}
    >
      {active ? on : off}
    </button>
  );
}

export function CompaniesToolbar({
  activeRouteName,
  modals,
  onCancelEdit,
  error,
  onDismissError,
  homeLocation,
  showingPanel,
}: CompaniesToolbarProps) {
  // Exclusive-panel toggles also clear any in-progress edit.
  const toggle = (fn: () => void) => () => {
    onCancelEdit();
    fn();
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-base-content/85">
            Track companies for your job search
          </p>
          {activeRouteName && (
            <p className="text-primary text-sm">
              Active route: {activeRouteName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleBtn
            active={modals.showSettings}
            on="Hide Settings"
            off="Home Location"
            onClick={toggle(modals.toggleSettings)}
          />
          <ToggleBtn
            active={modals.showImport}
            on="Cancel Import"
            off="Import CSV"
            onClick={toggle(modals.toggleImport)}
          />
          <ToggleBtn
            active={modals.showAddForm}
            primary
            on="Cancel"
            off="Add Company"
            onClick={toggle(modals.toggleAdd)}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      )}

      {!homeLocation && !showingPanel && (
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
          <button className="btn btn-sm" onClick={modals.openSettings}>
            Set Location
          </button>
        </div>
      )}
    </>
  );
}
