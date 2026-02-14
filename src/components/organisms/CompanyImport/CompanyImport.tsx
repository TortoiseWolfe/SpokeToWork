'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { ImportResult } from '@/types/company';

export interface CompanyImportProps {
  /** Callback to import a CSV file */
  onImport: (file: File) => Promise<ImportResult>;
  /** Callback when import is complete */
  onComplete?: (result: ImportResult) => void;
  /** Callback to cancel/close the import dialog */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * CompanyImport component
 *
 * Provides a file upload interface for importing companies from CSV files.
 * Shows progress and results after import completes.
 *
 * Expected CSV format:
 * name,address,contact_name,contact_title,phone,email,website,notes,status,priority
 *
 * @category organisms
 */
export default function CompanyImport({
  onImport,
  onComplete,
  onCancel,
  className = '',
  testId = 'company-import',
}: CompanyImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please select a CSV file');
        return;
      }

      setIsImporting(true);
      setError(null);
      setResult(null);

      try {
        const importResult = await onImport(file);
        setResult(importResult);
        onComplete?.(importResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
      } finally {
        setIsImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onImport, onComplete]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please drop a CSV file');
        return;
      }

      setIsImporting(true);
      setError(null);
      setResult(null);

      try {
        const importResult = await onImport(file);
        setResult(importResult);
        onComplete?.(importResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
      } finally {
        setIsImporting(false);
      }
    },
    [onImport, onComplete]
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <div data-testid={testId} className={`card bg-base-200 ${className}`}>
      <div className="card-body">
        <h2 className="card-title">Import Companies from CSV</h2>

        {/* CSV Format Info */}
        <div className="text-base-content/85 mb-4 text-sm">
          <p className="mb-1 font-medium">Expected CSV columns:</p>
          <code className="bg-base-300 block overflow-x-auto rounded px-2 py-1 text-xs">
            name,address,contact_name,contact_title,phone,email,website,notes,status,priority
          </code>
          <p className="mt-2 text-xs">
            Required: <strong>name</strong>, <strong>address</strong>. Optional:
            latitude, longitude (will be geocoded if not provided)
          </p>
        </div>

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

        {/* Import Result */}
        {result && (
          <div className="mb-4">
            <div
              className={`alert ${result.failed > 0 ? 'alert-warning' : 'alert-success'}`}
            >
              <div>
                <p className="font-medium">
                  Import complete: {result.success} succeeded, {result.failed}{' '}
                  failed
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto text-sm">
                <p className="text-error font-medium">Errors:</p>
                <ul className="list-inside list-disc">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-error">
                      Row {err.row}: {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="btn btn-sm btn-ghost mt-2" onClick={handleReset}>
              Import Another File
            </button>
          </div>
        )}

        {/* File Upload Area */}
        {!result && (
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center ${
              isImporting
                ? 'border-primary bg-primary/10'
                : 'border-base-content/20 hover:border-primary'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isImporting ? (
              <div className="flex flex-col items-center gap-2">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p>Importing... This may take a while for large files.</p>
              </div>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-base-content/75 mx-auto mb-4 h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2">Drag and drop a CSV file here, or</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label="Select CSV file"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  Select File
                </button>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="card-actions mt-4 justify-end">
          {onCancel && (
            <button
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={isImporting}
            >
              {result ? 'Close' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
