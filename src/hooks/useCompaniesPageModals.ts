'use client';

/**
 * useCompaniesPageModals
 *
 * One reducer for the six boolean-ish modal/form panels that
 * CompaniesPageInner had as independent useState calls. Opening one
 * closes the others ("exclusive" panels).
 */

import { useReducer, useMemo } from 'react';
import type { JobApplication } from '@/types/company';

type Panel = 'none' | 'addCompany' | 'settings' | 'import';

interface State {
  panel: Panel;
  routesDrawerOpen: boolean;
  appFormOpen: boolean;
  editingApplication: JobApplication | null;
}

type Action =
  | { type: 'open'; panel: Exclude<Panel, 'none'> }
  | { type: 'toggle'; panel: Exclude<Panel, 'none'> }
  | { type: 'close' }
  | { type: 'routesDrawer'; open: boolean }
  | { type: 'appForm'; editing: JobApplication | null }
  | { type: 'closeAppForm' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'open':
      return { ...s, panel: a.panel, appFormOpen: false };
    case 'toggle':
      return {
        ...s,
        panel: s.panel === a.panel ? 'none' : a.panel,
        appFormOpen: false,
      };
    case 'close':
      return { ...s, panel: 'none' };
    case 'routesDrawer':
      return { ...s, routesDrawerOpen: a.open };
    case 'appForm':
      return { ...s, appFormOpen: true, editingApplication: a.editing };
    case 'closeAppForm':
      return { ...s, appFormOpen: false, editingApplication: null };
  }
}

const initial: State = {
  panel: 'none',
  routesDrawerOpen: false,
  appFormOpen: false,
  editingApplication: null,
};

export interface ModalsApi {
  showAddForm: boolean;
  showSettings: boolean;
  showImport: boolean;
  /** True when any exclusive form panel is open */
  showingForm: boolean;
  routesDrawerOpen: boolean;
  appFormOpen: boolean;
  editingApplication: JobApplication | null;
  openAdd: () => void;
  toggleAdd: () => void;
  toggleSettings: () => void;
  toggleImport: () => void;
  openSettings: () => void;
  close: () => void;
  openRoutesDrawer: () => void;
  closeRoutesDrawer: () => void;
  openAppForm: (editing?: JobApplication | null) => void;
  closeAppForm: () => void;
}

export function useCompaniesPageModals(): ModalsApi {
  const [s, dispatch] = useReducer(reducer, initial);

  return useMemo<ModalsApi>(
    () => ({
      showAddForm: s.panel === 'addCompany',
      showSettings: s.panel === 'settings',
      showImport: s.panel === 'import',
      showingForm: s.panel !== 'none',
      routesDrawerOpen: s.routesDrawerOpen,
      appFormOpen: s.appFormOpen,
      editingApplication: s.editingApplication,
      openAdd: () => dispatch({ type: 'open', panel: 'addCompany' }),
      toggleAdd: () => dispatch({ type: 'toggle', panel: 'addCompany' }),
      toggleSettings: () => dispatch({ type: 'toggle', panel: 'settings' }),
      toggleImport: () => dispatch({ type: 'toggle', panel: 'import' }),
      openSettings: () => dispatch({ type: 'open', panel: 'settings' }),
      close: () => dispatch({ type: 'close' }),
      openRoutesDrawer: () => dispatch({ type: 'routesDrawer', open: true }),
      closeRoutesDrawer: () => dispatch({ type: 'routesDrawer', open: false }),
      openAppForm: (editing = null) => dispatch({ type: 'appForm', editing }),
      closeAppForm: () => dispatch({ type: 'closeAppForm' }),
    }),
    [s]
  );
}
