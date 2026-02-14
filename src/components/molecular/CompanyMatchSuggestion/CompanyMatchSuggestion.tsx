'use client';

import React from 'react';
import type { MatchResult, MatchConfidence } from '@/types/company';

export interface CompanyMatchSuggestionProps {
  /** List of match results to display */
  matches: MatchResult[];
  /** Callback when user wants to track an existing company */
  onTrack?: (match: MatchResult) => void;
  /** Callback when user wants to add as new private company */
  onAddNew?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

const CONFIDENCE_COLORS: Record<MatchConfidence, string> = {
  high: 'badge-success',
  medium: 'badge-warning',
  low: 'badge-ghost',
};

const CONFIDENCE_LABELS: Record<MatchConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * CompanyMatchSuggestion component
 *
 * Displays match results when adding a new company, allowing users to:
 * - Track an existing company from the shared registry
 * - Add as a new private company
 *
 * @category molecular
 */
export default function CompanyMatchSuggestion({
  matches,
  onTrack,
  onAddNew,
  isLoading = false,
  className = '',
  testId = 'company-match-suggestion',
}: CompanyMatchSuggestionProps) {
  // Don't render if no matches
  if (matches.length === 0) {
    return null;
  }

  return (
    <div data-testid={testId} className={`card bg-base-200 p-4 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          {matches.length} similar{' '}
          {matches.length === 1 ? 'company' : 'companies'} found
        </h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onAddNew}
          disabled={isLoading}
          aria-label="Add as new private company"
        >
          Add as new
        </button>
      </div>

      {/* Match List */}
      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.company_id}
            className="card bg-base-100 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              {/* Company Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{match.company_name}</span>

                  {/* Confidence Badge */}
                  <span
                    className={`badge ${CONFIDENCE_COLORS[match.confidence]} badge-sm`}
                  >
                    {CONFIDENCE_LABELS[match.confidence]}
                  </span>

                  {/* Verified Badge */}
                  {match.is_verified && (
                    <span
                      className="badge badge-info badge-sm"
                      title="Verified company"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}

                  {/* Domain Match Badge */}
                  {match.domain_match && (
                    <span
                      className="badge badge-primary badge-sm"
                      title="Domain matches"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Address */}
                {match.address && (
                  <div className="text-base-content/85 mt-1 text-sm">
                    {match.address}
                  </div>
                )}

                {/* Distance */}
                {match.distance_miles !== null && (
                  <div className="text-info mt-1 text-xs">
                    {match.distance_miles.toFixed(1)} mi away
                  </div>
                )}
              </div>

              {/* Track Button */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onTrack?.(match)}
                disabled={isLoading}
                aria-label={`Track this company: ${match.company_name}`}
              >
                Track this
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
