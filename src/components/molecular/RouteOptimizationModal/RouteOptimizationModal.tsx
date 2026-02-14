'use client';

/**
 * RouteOptimizationModal - Feature 046: Route Optimization
 *
 * Displays optimization results with before/after comparison,
 * distance savings, and apply/cancel actions.
 *
 * @category molecular
 */

import type { RouteOptimizationResult } from '@/lib/routes/optimization-types';

export interface CompanyInfo {
  id: string;
  name: string;
}

export interface RouteOptimizationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The optimization result to display */
  result: RouteOptimizationResult | null;
  /** Company information for displaying names */
  companies: CompanyInfo[];
  /** Original order of company IDs before optimization */
  originalOrder: string[];
  /** Loading state while optimization is in progress */
  isLoading?: boolean;
  /** Error message if optimization failed */
  error?: string | null;
  /** Callback when user applies the optimization */
  onApply: () => void;
  /** Callback when user cancels/closes the modal */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get company name by ID
 */
function getCompanyName(companies: CompanyInfo[], id: string): string {
  const company = companies.find((c) => c.id === id);
  return company?.name ?? id;
}

/**
 * RouteOptimizationModal component
 *
 * Shows optimization comparison and allows user to apply or reject changes.
 */
export default function RouteOptimizationModal({
  isOpen,
  result,
  companies,
  originalOrder,
  isLoading = false,
  error = null,
  onApply,
  onClose,
  className = '',
}: RouteOptimizationModalProps) {
  if (!isOpen) return null;

  const hasSavings = result && result.distanceSavingsMiles > 0.1;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50${className ? ` ${className}` : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="optimization-modal-title"
    >
      <div className="bg-base-100 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg shadow-xl">
        {/* Header */}
        <div className="border-base-300 flex items-center justify-between border-b p-4">
          <h2 id="optimization-modal-title" className="text-xl font-semibold">
            Route Optimization
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Loading state */}
          {isLoading && (
            <div
              className="flex flex-col items-center gap-4 py-8"
              role="status"
              aria-live="polite"
            >
              <span className="loading loading-spinner loading-lg" />
              <p className="text-base-content/85">
                Calculating optimal route...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="alert alert-error" role="alert">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {result && !isLoading && !error && (
            <>
              {/* Savings summary */}
              <div
                className={`alert ${hasSavings ? 'alert-success' : 'alert-info'}`}
                role="status"
              >
                {hasSavings ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">
                        Save {result.distanceSavingsMiles.toFixed(1)} miles (
                        {result.distanceSavingsPercent.toFixed(0)}%)
                      </p>
                      <p className="text-sm opacity-80">
                        {result.originalDistanceMiles.toFixed(1)} mi →{' '}
                        {result.totalDistanceMiles.toFixed(1)} mi
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Route is already optimally ordered</span>
                  </>
                )}
              </div>

              {/* Before/After comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Before */}
                <div>
                  <h3 className="text-base-content/85 mb-2 text-sm font-medium">
                    Current Order
                  </h3>
                  <ol className="space-y-1" aria-label="Current route order">
                    {originalOrder.map((id, index) => (
                      <li
                        key={id}
                        className="bg-base-200 flex items-center gap-2 rounded px-2 py-1 text-sm"
                      >
                        <span className="text-base-content/75 font-mono text-xs">
                          {index + 1}.
                        </span>
                        <span className="truncate">
                          {getCompanyName(companies, id)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* After */}
                <div>
                  <h3 className="text-base-content/85 mb-2 text-sm font-medium">
                    Optimized Order
                  </h3>
                  <ol className="space-y-1" aria-label="Optimized route order">
                    {result.optimizedOrder.map((id, index) => {
                      const originalIndex = originalOrder.indexOf(id);
                      const moved = originalIndex !== index;
                      return (
                        <li
                          key={id}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                            moved ? 'bg-success/20' : 'bg-base-200'
                          }`}
                        >
                          <span className="text-base-content/75 font-mono text-xs">
                            {index + 1}.
                          </span>
                          <span className="truncate">
                            {getCompanyName(companies, id)}
                          </span>
                          {moved && (
                            <span
                              className="text-success ml-auto text-xs"
                              aria-label="Moved"
                            >
                              {originalIndex > index ? '↑' : '↓'}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Estimated time */}
              <div className="bg-base-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/85">Estimated Time:</span>
                  <span className="font-medium">
                    {Math.round(result.estimatedTimeMinutes)} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base-content/85">Total Distance:</span>
                  <span className="font-medium">
                    {result.totalDistanceMiles.toFixed(1)} miles
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="border-base-300 flex justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="btn btn-primary"
            disabled={isLoading || !!error || !result || !hasSavings}
            aria-label={
              isLoading ? 'Applying optimization' : 'Apply Optimization'
            }
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Apply Optimization'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
