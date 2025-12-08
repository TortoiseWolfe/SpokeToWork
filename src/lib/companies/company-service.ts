/**
 * Company Service - Feature 011
 *
 * @deprecated This service uses the OLD `companies` table.
 * Use MultiTenantCompanyService from './multi-tenant-service' instead,
 * which uses the unified view (user_companies_unified) and multi-tenant
 * tables (shared_companies, user_company_tracking, private_companies).
 *
 * This service is kept for backwards compatibility with:
 * - job_applications (still references old companies table)
 * - CSV import/export (needs migration to multi-tenant)
 *
 * DO NOT use this service for new features.
 *
 * @see specs/011-company-management/contracts/company-service.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyFilters,
  CompanySort,
  HomeLocation,
  GeocodeResult,
  DistanceResult,
  ImportResult,
  SyncResult,
  CompanyWithApplications,
  JobApplication,
} from '@/types/company';
import { geocode, haversineDistance, validateDistance } from './geocoding';
import { OfflineSyncService } from './offline-sync';

/**
 * Error types for company operations
 */
export class DuplicateCompanyError extends Error {
  constructor(name: string, address: string) {
    super(`Company "${name}" at "${address}" already exists`);
    this.name = 'DuplicateCompanyError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`Company with id "${id}" not found`);
    this.name = 'NotFoundError';
  }
}

/**
 * Company Service class
 */
export class CompanyService {
  private supabase: SupabaseClient;
  private offlineStore: OfflineSyncService;
  private userId: string | null = null;

  constructor(supabase: SupabaseClient, offlineStore?: OfflineSyncService) {
    this.supabase = supabase;
    this.offlineStore = offlineStore ?? new OfflineSyncService();
  }

  /**
   * Initialize the service (required before use)
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.offlineStore.initialize();
  }

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    return this.offlineStore.isOnline();
  }

  /**
   * Geocode an address
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    return geocode(address);
  }

  /**
   * Validate coordinates against home location
   */
  validateCoordinates(
    lat: number,
    lng: number,
    home: HomeLocation
  ): DistanceResult {
    return validateDistance(
      lat,
      lng,
      home.latitude,
      home.longitude,
      home.radius_miles
    );
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    return haversineDistance(lat1, lon1, lat2, lon2);
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  /**
   * Create a new company
   */
  async create(data: CompanyCreate): Promise<Company> {
    this.ensureInitialized();

    // Validate required fields
    if (!data.name?.trim()) {
      throw new ValidationError('Company name is required');
    }
    if (!data.address?.trim()) {
      throw new ValidationError('Address is required');
    }
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new ValidationError('Coordinates are required');
    }

    // Validate coordinate ranges
    if (data.latitude < -90 || data.latitude > 90) {
      throw new ValidationError('Latitude must be between -90 and 90');
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new ValidationError('Longitude must be between -180 and 180');
    }

    const now = new Date().toISOString();
    const company: Company = {
      id: crypto.randomUUID(),
      user_id: this.userId!,
      name: data.name.trim(),
      contact_name: data.contact_name?.trim() || null,
      contact_title: data.contact_title?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      website: data.website?.trim() || null,
      careers_url: data.careers_url?.trim() || null,
      address: data.address.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      extended_range: data.extended_range ?? false,
      status: data.status ?? 'not_contacted',
      priority: data.priority ?? 3,
      notes: data.notes?.trim() || null,
      follow_up_date: data.follow_up_date || null,
      route_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    if (this.isOnline()) {
      // Try to save to Supabase
      try {
        const { data: inserted, error } = await this.supabase
          .from('companies')
          .insert(company)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new DuplicateCompanyError(company.name, company.address);
          }
          throw error;
        }

        // Save to local storage
        await this.offlineStore.saveLocal(inserted, true);
        return inserted;
      } catch (error) {
        if (
          error instanceof DuplicateCompanyError ||
          error instanceof ValidationError
        ) {
          throw error;
        }
        // Network error - fall through to offline handling
        console.warn('Failed to save online, queuing for sync:', error);
      }
    }

    // Offline: save locally and queue for sync
    await this.offlineStore.saveLocal(company, false);
    await this.offlineStore.queueChange('create', company.id, data);

    return company;
  }

  /**
   * Get a company by ID
   */
  async getById(id: string): Promise<Company | null> {
    this.ensureInitialized();

    if (this.isOnline()) {
      try {
        const { data, error } = await this.supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // Not found
          }
          throw error;
        }

        // Update local cache
        await this.offlineStore.saveLocal(data, true);
        return data;
      } catch (error) {
        console.warn('Failed to fetch online, using local:', error);
      }
    }

    // Return from local storage
    return this.offlineStore.getLocal(id);
  }

  /**
   * Get all companies with optional filtering and sorting
   */
  async getAll(
    filters?: CompanyFilters,
    sort?: CompanySort
  ): Promise<Company[]> {
    this.ensureInitialized();

    if (this.isOnline()) {
      try {
        let query = this.supabase.from('companies').select('*');

        // Apply filters
        if (filters?.status) {
          const statuses = Array.isArray(filters.status)
            ? filters.status
            : [filters.status];
          query = query.in('status', statuses);
        }

        if (filters?.priority) {
          const priorities = Array.isArray(filters.priority)
            ? filters.priority
            : [filters.priority];
          query = query.in('priority', priorities);
        }

        if (filters?.route_id !== undefined) {
          if (filters.route_id === null) {
            query = query.is('route_id', null);
          } else {
            query = query.eq('route_id', filters.route_id);
          }
        }

        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }

        if (filters?.extended_range !== undefined) {
          query = query.eq('extended_range', filters.extended_range);
        }

        // Apply sorting
        const sortField = sort?.field ?? 'created_at';
        const sortDir = sort?.direction ?? 'desc';
        query = query.order(sortField, { ascending: sortDir === 'asc' });

        const { data, error } = await query;

        if (error) throw error;

        // Apply search filter client-side (Supabase full-text is complex)
        let companies = data as Company[];
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          companies = companies.filter((c) => {
            return (
              c.name.toLowerCase().includes(searchLower) ||
              c.contact_name?.toLowerCase().includes(searchLower) ||
              c.notes?.toLowerCase().includes(searchLower)
            );
          });
        }

        // Update local cache
        for (const company of companies) {
          await this.offlineStore.saveLocal(company, true);
        }

        return companies;
      } catch (error) {
        console.warn('Failed to fetch online, using local:', error);
      }
    }

    // Return from local storage with client-side filtering
    const local = await this.offlineStore.getAllLocal(filters);

    // Apply sorting
    if (sort) {
      local.sort((a, b) => {
        let aVal: unknown;
        let bVal: unknown;

        if (sort.field === 'zip_code') {
          // Extract zip code from address
          aVal = a.address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? '';
          bVal = b.address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? '';
        } else {
          aVal = a[sort.field as keyof typeof a] ?? '';
          bVal = b[sort.field as keyof typeof b] ?? '';
        }

        const comparison = String(aVal).localeCompare(String(bVal));
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return local;
  }

  /**
   * Update an existing company
   */
  async update(data: CompanyUpdate): Promise<Company> {
    this.ensureInitialized();

    if (!data.id) {
      throw new ValidationError('Company ID is required for update');
    }

    const existing = await this.getById(data.id);
    if (!existing) {
      throw new NotFoundError(data.id);
    }

    const now = new Date().toISOString();
    const updated: Company = {
      ...existing,
      name: data.name?.trim() ?? existing.name,
      contact_name:
        data.contact_name !== undefined
          ? data.contact_name
          : existing.contact_name,
      contact_title:
        data.contact_title !== undefined
          ? data.contact_title
          : existing.contact_title,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      email: data.email !== undefined ? data.email : existing.email,
      website: data.website !== undefined ? data.website : existing.website,
      address: data.address?.trim() ?? existing.address,
      latitude: data.latitude ?? existing.latitude,
      longitude: data.longitude ?? existing.longitude,
      extended_range: data.extended_range ?? existing.extended_range,
      status: data.status ?? existing.status,
      priority: data.priority ?? existing.priority,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      follow_up_date:
        data.follow_up_date !== undefined
          ? data.follow_up_date
          : existing.follow_up_date,
      route_id: data.route_id !== undefined ? data.route_id : existing.route_id,
      is_active: data.is_active ?? existing.is_active,
      updated_at: now,
    };

    if (this.isOnline()) {
      try {
        const { data: result, error } = await this.supabase
          .from('companies')
          .update(updated)
          .eq('id', data.id)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new DuplicateCompanyError(updated.name, updated.address);
          }
          throw error;
        }

        await this.offlineStore.saveLocal(result, true);
        return result;
      } catch (error) {
        if (
          error instanceof DuplicateCompanyError ||
          error instanceof ValidationError
        ) {
          throw error;
        }
        console.warn('Failed to update online, queuing for sync:', error);
      }
    }

    // Offline: update locally and queue
    const offlineCompany = await this.offlineStore.getLocal(data.id);
    if (offlineCompany) {
      await this.offlineStore.updateLocal({ ...offlineCompany, ...updated });
    }
    await this.offlineStore.queueChange('update', data.id, data);

    return updated;
  }

  /**
   * Delete a company
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    if (this.isOnline()) {
      try {
        const { error } = await this.supabase
          .from('companies')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await this.offlineStore.deleteLocal(id);
        await this.offlineStore.clearQueueForCompany(id);
        return;
      } catch (error) {
        console.warn('Failed to delete online, queuing for sync:', error);
      }
    }

    // Offline: delete locally and queue
    await this.offlineStore.deleteLocal(id);
    await this.offlineStore.queueChange('delete', id, null);
  }

  // =========================================================================
  // Company with Applications Queries
  // =========================================================================

  /**
   * Get a company with all its job applications
   */
  async getCompanyWithApplications(
    id: string
  ): Promise<CompanyWithApplications | null> {
    this.ensureInitialized();

    // Get company
    const company = await this.getById(id);
    if (!company) {
      return null;
    }

    // Get applications for this company
    const { data: applications, error } = await this.supabase
      .from('job_applications')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch applications:', error);
      return {
        ...company,
        applications: [],
        latest_application: null,
        total_applications: 0,
      };
    }

    const apps = (applications || []) as JobApplication[];

    return {
      ...company,
      applications: apps,
      latest_application: apps[0] || null,
      total_applications: apps.length,
    };
  }

  /**
   * Get all companies with their latest job application (for list view)
   */
  async getAllWithLatestApplication(
    filters?: CompanyFilters,
    sort?: CompanySort
  ): Promise<CompanyWithApplications[]> {
    this.ensureInitialized();

    // Get all companies first
    const companies = await this.getAll(filters, sort);

    if (companies.length === 0) {
      return [];
    }

    // Get all applications in one query
    const { data: applications, error } = await this.supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch applications:', error);
      // Return companies without applications
      return companies.map((company) => ({
        ...company,
        applications: [],
        latest_application: null,
        total_applications: 0,
      }));
    }

    // Group applications by company
    const appsByCompany = new Map<string, JobApplication[]>();
    for (const app of (applications || []) as JobApplication[]) {
      const companyId = app.shared_company_id || app.private_company_id;
      if (!companyId) continue;
      const existing = appsByCompany.get(companyId) || [];
      existing.push(app);
      appsByCompany.set(companyId, existing);
    }

    // Build the result
    return companies.map((company) => {
      const companyApps = appsByCompany.get(company.id) || [];
      return {
        ...company,
        applications: companyApps,
        latest_application: companyApps[0] || null,
        total_applications: companyApps.length,
      };
    });
  }

  // =========================================================================
  // Sync Operations
  // =========================================================================

  /**
   * Sync pending offline changes with server
   */
  async syncOfflineChanges(): Promise<SyncResult> {
    this.ensureInitialized();

    if (!this.isOnline()) {
      return { synced: 0, conflicts: 0, failed: 0 };
    }

    const queue = await this.offlineStore.getQueuedChanges();
    let synced = 0;
    let conflicts = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'create':
            if (item.payload) {
              await this.create(item.payload as CompanyCreate);
              synced++;
            }
            break;

          case 'update':
            if (item.payload) {
              // Check for conflicts
              const local = await this.offlineStore.getLocal(item.company_id);
              const { data: server } = await this.supabase
                .from('companies')
                .select('*')
                .eq('id', item.company_id)
                .single();

              if (server && local) {
                if (
                  new Date(server.updated_at) > new Date(local.synced_at || 0)
                ) {
                  // Conflict detected
                  await this.offlineStore.storeConflict(
                    item.company_id,
                    local,
                    server
                  );
                  conflicts++;
                  continue;
                }
              }

              await this.update(item.payload as CompanyUpdate);
              synced++;
            }
            break;

          case 'delete':
            await this.delete(item.company_id);
            synced++;
            break;
        }

        await this.offlineStore.clearQueueItem(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        failed++;
      }
    }

    return { synced, conflicts, failed };
  }

  /**
   * Get unresolved sync conflicts
   */
  async getConflicts() {
    return this.offlineStore.getConflicts();
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(companyId: string, resolution: 'local' | 'server') {
    return this.offlineStore.resolveConflict(companyId, resolution);
  }

  // =========================================================================
  // Import/Export (stubs - to be implemented in Phase 8-9)
  // =========================================================================

  /**
   * Import companies from CSV file
   * Expected CSV columns: name,address,contact_name,contact_title,phone,email,website,notes,status,priority
   * Optional columns: latitude,longitude (if not provided, address will be geocoded)
   */
  async importFromCSV(file: File): Promise<ImportResult> {
    this.ensureInitialized();

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return {
        success: 0,
        failed: 0,
        errors: [{ row: 0, reason: 'No data rows found' }],
      };
    }

    const headers = this.parseCSVRow(lines[0]).map((h) =>
      h.toLowerCase().trim()
    );
    const nameIndex = headers.indexOf('name');
    const addressIndex = headers.indexOf('address');

    if (nameIndex === -1) {
      return {
        success: 0,
        failed: 0,
        errors: [{ row: 0, reason: 'Missing required column: name' }],
      };
    }
    if (addressIndex === -1) {
      return {
        success: 0,
        failed: 0,
        errors: [{ row: 0, reason: 'Missing required column: address' }],
      };
    }

    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVRow(lines[i]);
      const rowNum = i + 1;

      try {
        const name = values[nameIndex]?.trim();
        if (!name) {
          result.errors.push({ row: rowNum, reason: 'Missing company name' });
          result.failed++;
          continue;
        }

        const address = values[addressIndex]?.trim();
        if (!address) {
          result.errors.push({ row: rowNum, reason: 'Missing address' });
          result.failed++;
          continue;
        }

        // Check for existing coordinates in CSV, otherwise geocode
        let latitude = this.parseNumber(
          this.getCSVValue(values, headers, 'latitude')
        );
        let longitude = this.parseNumber(
          this.getCSVValue(values, headers, 'longitude')
        );

        if (latitude === undefined || longitude === undefined) {
          // Geocode the address
          const geocodeResult = await geocode(address);
          if (
            !geocodeResult.success ||
            geocodeResult.latitude === undefined ||
            geocodeResult.longitude === undefined
          ) {
            result.errors.push({
              row: rowNum,
              reason: `Geocoding failed: ${geocodeResult.error || 'Could not find coordinates'}`,
            });
            result.failed++;
            continue;
          }
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
        }

        const companyData: CompanyCreate = {
          name,
          address,
          latitude,
          longitude,
          contact_name: this.getCSVValue(values, headers, 'contact_name'),
          contact_title: this.getCSVValue(values, headers, 'contact_title'),
          phone: this.getCSVValue(values, headers, 'phone'),
          email: this.getCSVValue(values, headers, 'email'),
          website: this.getCSVValue(values, headers, 'website'),
          notes: this.getCSVValue(values, headers, 'notes'),
          status: this.parseStatus(this.getCSVValue(values, headers, 'status')),
          priority: this.parsePriority(
            this.getCSVValue(values, headers, 'priority')
          ),
        };

        await this.create(companyData);
        result.success++;
      } catch (err) {
        result.errors.push({
          row: rowNum,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Export companies to CSV format
   */
  async exportToCSV(): Promise<Blob> {
    this.ensureInitialized();
    const companies = await this.getAll();

    const headers = [
      'name',
      'address',
      'latitude',
      'longitude',
      'contact_name',
      'contact_title',
      'phone',
      'email',
      'website',
      'status',
      'priority',
      'notes',
      'follow_up_date',
      'extended_range',
      'is_active',
    ];

    const rows = companies.map((c) =>
      headers
        .map((h) => this.escapeCSV(String(c[h as keyof Company] ?? '')))
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }

  /**
   * Export companies to JSON format
   */
  async exportToJSON(): Promise<Blob> {
    this.ensureInitialized();
    const companies = await this.getAll();

    const exportData = companies.map(
      ({ id, user_id, created_at, updated_at, ...rest }) => rest
    );
    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Export companies to GPX format for GPS navigation
   */
  async exportToGPX(): Promise<Blob> {
    this.ensureInitialized();
    const companies = await this.getAll();

    const waypoints = companies
      .filter((c) => c.latitude && c.longitude)
      .map(
        (c) => `  <wpt lat="${c.latitude}" lon="${c.longitude}">
    <name>${this.escapeXML(c.name)}</name>
    <desc>${this.escapeXML(c.address || '')}</desc>
  </wpt>`
      );

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SpokeToWork">
${waypoints.join('\n')}
</gpx>`;

    return new Blob([gpx], { type: 'application/gpx+xml' });
  }

  /**
   * Export companies to printable HTML format
   */
  async exportToPrintable(): Promise<Blob> {
    this.ensureInitialized();
    const companies = await this.getAll();

    const statusLabels: Record<string, string> = {
      not_contacted: 'Not Contacted',
      contacted: 'Contacted',
      follow_up: 'Follow Up',
      meeting: 'Meeting',
      outcome_positive: 'Positive',
      outcome_negative: 'Negative',
    };

    const rows = companies
      .map(
        (c) => `    <tr>
      <td>${this.escapeXML(c.name)}</td>
      <td>${this.escapeXML(c.address || '-')}</td>
      <td>${this.escapeXML(c.contact_name || '-')}</td>
      <td>${this.escapeXML(c.phone || '-')}</td>
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
    @media print {
      th { background-color: #e0e0e0 !important; -webkit-print-color-adjust: exact; }
    }
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

  // =========================================================================
  // CSV/XML Helper Methods
  // =========================================================================

  private parseCSVRow(row: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private getCSVValue(
    values: string[],
    headers: string[],
    column: string
  ): string | undefined {
    const index = headers.indexOf(column.toLowerCase());
    const value = index >= 0 ? values[index]?.trim() : undefined;
    return value || undefined;
  }

  private parseStatus(value: string | undefined): CompanyCreate['status'] {
    const validStatuses = [
      'not_contacted',
      'contacted',
      'follow_up',
      'meeting',
      'outcome_positive',
      'outcome_negative',
    ];
    if (value && validStatuses.includes(value.toLowerCase())) {
      return value.toLowerCase() as CompanyCreate['status'];
    }
    return 'not_contacted';
  }

  private parsePriority(value: string | undefined): CompanyCreate['priority'] {
    const num = value ? parseInt(value, 10) : NaN;
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return num as 1 | 2 | 3 | 4 | 5;
    }
    return 3;
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeXML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private ensureInitialized(): void {
    if (!this.userId) {
      throw new Error(
        'CompanyService not initialized. Call initialize() first.'
      );
    }
  }
}
