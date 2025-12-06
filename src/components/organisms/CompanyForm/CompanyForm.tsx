'use client';

import React, { useState, useCallback, useEffect } from 'react';
import CoordinateMap from '@/components/molecular/CoordinateMap';
import { geocode, validateDistance } from '@/lib/companies/geocoding';
import type {
  Company,
  CompanyCreate,
  CompanyUpdate,
  ApplicationStatus,
  Priority,
  HomeLocation,
} from '@/types/company';

export interface CompanyFormProps {
  /** Existing company data for edit mode */
  company?: Company | null;
  /** Home location for distance validation */
  homeLocation?: HomeLocation | null;
  /** Callback when form is submitted */
  onSubmit?: (data: CompanyCreate | CompanyUpdate) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'meeting', label: 'Meeting Scheduled' },
  { value: 'outcome_positive', label: 'Positive Outcome' },
  { value: 'outcome_negative', label: 'Negative Outcome' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 1, label: '1 - Highest' },
  { value: 2, label: '2 - High' },
  { value: 3, label: '3 - Medium' },
  { value: 4, label: '4 - Low' },
  { value: 5, label: '5 - Lowest' },
];

/**
 * CompanyForm component for adding and editing companies
 *
 * Features:
 * - All company fields with DaisyUI styling
 * - Address geocoding with visual verification
 * - Extended range warning display
 * - Create and edit modes
 *
 * @category organisms
 */
export default function CompanyForm({
  company,
  homeLocation,
  onSubmit,
  onCancel,
  className = '',
  testId = 'company-form',
}: CompanyFormProps) {
  const isEditMode = !!company;

  // Form state
  const [name, setName] = useState(company?.name || '');
  const [contactName, setContactName] = useState(company?.contact_name || '');
  const [contactTitle, setContactTitle] = useState(
    company?.contact_title || ''
  );
  const [phone, setPhone] = useState(company?.phone || '');
  const [email, setEmail] = useState(company?.email || '');
  const [website, setWebsite] = useState(company?.website || '');
  const [address, setAddress] = useState(company?.address || '');
  const [latitude, setLatitude] = useState(company?.latitude || 40.7128);
  const [longitude, setLongitude] = useState(company?.longitude || -74.006);
  const [status, setStatus] = useState<ApplicationStatus>(
    company?.status || 'not_contacted'
  );
  const [priority, setPriority] = useState<Priority>(company?.priority || 3);
  const [notes, setNotes] = useState(company?.notes || '');
  const [followUpDate, setFollowUpDate] = useState(
    company?.follow_up_date || ''
  );

  // UI state
  const [hasCoordinates, setHasCoordinates] = useState(!!company);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [extendedRange, setExtendedRange] = useState(
    company?.extended_range || false
  );
  const [distanceFromHome, setDistanceFromHome] = useState<number | null>(null);

  // Update form when company prop changes (edit mode)
  useEffect(() => {
    if (company) {
      setName(company.name);
      setContactName(company.contact_name || '');
      setContactTitle(company.contact_title || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setWebsite(company.website || '');
      setAddress(company.address);
      setLatitude(company.latitude);
      setLongitude(company.longitude);
      setStatus(company.status);
      setPriority(company.priority);
      setNotes(company.notes || '');
      setFollowUpDate(company.follow_up_date || '');
      setExtendedRange(company.extended_range);
      setHasCoordinates(true);
    }
  }, [company]);

  // Validate distance when coordinates or home location changes
  useEffect(() => {
    if (hasCoordinates && homeLocation) {
      const result = validateDistance(
        latitude,
        longitude,
        homeLocation.latitude,
        homeLocation.longitude,
        homeLocation.radius_miles
      );
      setDistanceFromHome(result.distance_miles);
      setExtendedRange(!result.within_radius);
    }
  }, [latitude, longitude, homeLocation, hasCoordinates]);

  const handleGeocode = useCallback(async () => {
    if (!address.trim()) {
      setGeocodeError('Please enter an address');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await geocode(address);
      if (
        !result.success ||
        result.latitude === undefined ||
        result.longitude === undefined
      ) {
        setGeocodeError(result.error || 'Failed to geocode address');
        return;
      }
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setHasCoordinates(true);
    } catch (error) {
      setGeocodeError(
        error instanceof Error ? error.message : 'Failed to geocode address'
      );
    } finally {
      setIsGeocoding(false);
    }
  }, [address]);

  const handleCoordinateChange = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setHasCoordinates(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!name.trim()) {
        setSubmitError('Company name is required');
        return;
      }

      if (!address.trim()) {
        setSubmitError('Address is required');
        return;
      }

      if (!hasCoordinates) {
        setSubmitError('Please geocode the address or click on the map');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const baseData = {
          name: name.trim(),
          contact_name: contactName.trim() || undefined,
          contact_title: contactTitle.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          website: website.trim() || undefined,
          address: address.trim(),
          latitude,
          longitude,
          extended_range: extendedRange,
          status,
          priority,
          notes: notes.trim() || undefined,
          follow_up_date: followUpDate || undefined,
        };

        const data: CompanyCreate | CompanyUpdate =
          isEditMode && company ? { id: company.id, ...baseData } : baseData;

        if (onSubmit) {
          await onSubmit(data);
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : 'Failed to save company'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      name,
      contactName,
      contactTitle,
      phone,
      email,
      website,
      address,
      latitude,
      longitude,
      extendedRange,
      status,
      priority,
      notes,
      followUpDate,
      hasCoordinates,
      isEditMode,
      company,
      onSubmit,
    ]
  );

  return (
    <form
      data-testid={testId}
      className={`card bg-base-100 shadow-xl ${className}`}
      onSubmit={handleSubmit}
    >
      <div className="card-body">
        <h2 className="card-title">
          {isEditMode ? 'Edit Company' : 'Add New Company'}
        </h2>

        {/* Company Name - Required */}
        <div className="form-control">
          <label className="label" htmlFor="company-name">
            <span className="label-text">
              Company Name <span className="text-error">*</span>
            </span>
          </label>
          <input
            id="company-name"
            type="text"
            placeholder="Enter company name"
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-control">
            <label className="label" htmlFor="contact-name">
              <span className="label-text">Contact Name</span>
            </label>
            <input
              id="contact-name"
              type="text"
              placeholder="Contact person"
              className="input input-bordered"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="contact-title">
              <span className="label-text">Contact Title</span>
            </label>
            <input
              id="contact-title"
              type="text"
              placeholder="Job title"
              className="input input-bordered"
              value={contactTitle}
              onChange={(e) => setContactTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-control">
            <label className="label" htmlFor="phone">
              <span className="label-text">Phone</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="Phone number"
              className="input input-bordered"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="email">
              <span className="label-text">Email</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email address"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label" htmlFor="website">
            <span className="label-text">Website</span>
          </label>
          <input
            id="website"
            type="url"
            placeholder="https://example.com"
            className="input input-bordered"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {/* Address - Required */}
        <div className="form-control">
          <label className="label" htmlFor="address">
            <span className="label-text">
              Address <span className="text-error">*</span>
            </span>
          </label>
          <div className="flex gap-2">
            <input
              id="address"
              type="text"
              placeholder="Enter full address"
              className="input input-bordered flex-1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGeocode}
              disabled={isGeocoding || !address.trim()}
            >
              {isGeocoding ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                'Geocode'
              )}
            </button>
          </div>
          {geocodeError && (
            <label className="label">
              <span className="label-text-alt text-error">{geocodeError}</span>
            </label>
          )}
        </div>

        {/* Map Preview */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Location Preview</span>
            <span className="label-text-alt">Click map to adjust</span>
          </label>
          <CoordinateMap
            latitude={latitude}
            longitude={longitude}
            onCoordinateChange={handleCoordinateChange}
            homeLocation={homeLocation || undefined}
            height="500px"
            interactive={true}
            testId="company-location-map"
          />
          {hasCoordinates && (
            <label className="label">
              <span className="label-text-alt">
                Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
              </span>
              {distanceFromHome !== null && (
                <span className="label-text-alt">
                  {distanceFromHome.toFixed(1)} mi from home
                </span>
              )}
            </label>
          )}
        </div>

        {/* Extended Range Warning */}
        {extendedRange && hasCoordinates && (
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>
              This location is outside your configured radius
              {distanceFromHome !== null && homeLocation
                ? ` (${distanceFromHome.toFixed(1)} mi > ${homeLocation.radius_miles} mi)`
                : ''}
            </span>
          </div>
        )}

        {/* Status and Priority */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-control">
            <label className="label" htmlFor="status">
              <span className="label-text">Status</span>
            </label>
            <select
              id="status"
              className="select select-bordered"
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="priority">
              <span className="label-text">Priority</span>
            </label>
            <select
              id="priority"
              className="select select-bordered"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as Priority)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Follow-up Date */}
        <div className="form-control">
          <label className="label" htmlFor="follow-up-date">
            <span className="label-text">Follow-up Date</span>
          </label>
          <input
            id="follow-up-date"
            type="date"
            className="input input-bordered"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="form-control">
          <label className="label" htmlFor="notes">
            <span className="label-text">Notes</span>
          </label>
          <textarea
            id="notes"
            placeholder="Additional notes..."
            className="textarea textarea-bordered h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="alert alert-error">
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="card-actions mt-6 justify-end">
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !hasCoordinates}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {isEditMode ? 'Saving...' : 'Adding...'}
              </>
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Add Company'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
