'use client';

import React, { useState, useCallback } from 'react';

export type ExportFormat = 'csv' | 'json' | 'gpx' | 'printable';

export interface CompanyExportProps {
  /** Callback to export in a specific format */
  onExport: (format: ExportFormat) => Promise<Blob>;
  /** Number of companies that will be exported */
  companyCount?: number;
  /** Disable the export buttons */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; description: string; icon: string }
> = {
  csv: {
    label: 'CSV',
    description: 'Spreadsheet format',
    icon: '📊',
  },
  json: {
    label: 'JSON',
    description: 'Data interchange format',
    icon: '📄',
  },
  gpx: {
    label: 'GPX',
    description: 'GPS navigation format',
    icon: '🗺️',
  },
  printable: {
    label: 'Print',
    description: 'Printable HTML format',
    icon: '🖨️',
  },
};

/**
 * CompanyExport component
 *
 * Provides export options for company data in multiple formats:
 * - CSV: For spreadsheets
 * - JSON: For data interchange
 * - GPX: For GPS devices
 * - Printable: For printing
 *
 * @category molecular
 */
export default function CompanyExport({
  onExport,
  companyCount = 0,
  disabled = false,
  className = '',
  testId = 'company-export',
}: CompanyExportProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format);
      setError(null);

      try {
        const blob = await onExport(format);

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Set filename based on format
        const timestamp = new Date().toISOString().split('T')[0];
        const extensions: Record<ExportFormat, string> = {
          csv: 'csv',
          json: 'json',
          gpx: 'gpx',
          printable: 'html',
        };
        link.download = `companies-${timestamp}.${extensions[format]}`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup URL
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setExporting(null);
      }
    },
    [onExport]
  );

  const isDisabled = disabled || companyCount === 0;

  return (
    <div data-testid={testId} className={`${className}`}>
      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((format) => {
          const info = FORMAT_INFO[format];
          const isExporting = exporting === format;

          return (
            <button
              key={format}
              className={`btn btn-sm ${isExporting ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleExport(format)}
              disabled={isDisabled || exporting !== null}
              title={info.description}
              aria-label={`Export as ${info.label}`}
            >
              {isExporting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <span className="mr-1">{info.icon}</span>
              )}
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Company count */}
      {companyCount > 0 && (
        <p className="text-base-content/80 mt-2 text-xs">
          {companyCount} {companyCount === 1 ? 'company' : 'companies'} will be
          exported
        </p>
      )}

      {companyCount === 0 && (
        <p className="text-base-content/80 mt-2 text-xs">
          No companies to export
        </p>
      )}
    </div>
  );
}
