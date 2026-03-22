'use client';

import React, { useRef, useState } from 'react';
import type { Resume } from '@/lib/resumes/types';

export interface ResumeListProps {
  resumes: Resume[];
  isLoading: boolean;
  onUpload: (file: File, label: string) => Promise<void>;
  onRemove: (resumeId: string) => Promise<void>;
  onSetDefault: (resumeId: string) => Promise<void>;
  onRename: (resumeId: string, label: string) => Promise<void>;
  disabled?: boolean;
  maxResumes?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  return (bytes / 1024).toFixed(0) + ' KB';
}

interface ResumeItemProps {
  resume: Resume;
  disabled: boolean;
  onRemove: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onRename: (id: string, label: string) => Promise<void>;
}

function ResumeItem({ resume, disabled, onRemove, onSetDefault, onRename }: ResumeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(resume.label);

  const handleRenameStart = () => {
    setRenameValue(resume.label);
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    await onRename(resume.id, renameValue);
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(resume.label);
    setIsRenaming(false);
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-base-300 p-3">
      <div className="flex items-center gap-2">
        {isRenaming ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              aria-label="New resume label"
              autoFocus
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleRenameSave}
              disabled={disabled || !renameValue.trim()}
            >
              Save
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleRenameCancel}
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 font-medium">{resume.label}</span>
            {resume.is_default && (
              <span className="badge badge-primary badge-sm">Default</span>
            )}
          </>
        )}
      </div>
      <div className="text-base-content/60 text-sm">
        {resume.file_name} &bull; {formatFileSize(resume.file_size)}
      </div>
      {!isRenaming && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleRenameStart}
            disabled={disabled}
            aria-label={`Rename ${resume.label}`}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost text-error"
            onClick={() => onRemove(resume.id)}
            disabled={disabled}
            aria-label={`Remove ${resume.label}`}
          >
            Remove
          </button>
          {!resume.is_default && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onSetDefault(resume.id)}
              disabled={disabled}
              aria-label={`Set ${resume.label} as default`}
            >
              Set Default
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function ResumeList({
  resumes,
  isLoading,
  onUpload,
  onRemove,
  onSetDefault,
  onRename,
  disabled = false,
  maxResumes = 5,
}: ResumeListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setUploadLabel(file.name.replace(/\.[^.]+$/, ''));
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleUploadSave = async () => {
    if (!pendingFile || !uploadLabel.trim()) return;
    setIsUploading(true);
    try {
      await onUpload(pendingFile, uploadLabel.trim());
    } finally {
      setPendingFile(null);
      setUploadLabel('');
      setIsUploading(false);
    }
  };

  const handleUploadCancel = () => {
    setPendingFile(null);
    setUploadLabel('');
  };

  const atMax = resumes.length >= maxResumes;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-8"
        role="status"
        aria-label="Loading resumes"
      >
        <span className="loading loading-spinner loading-md" aria-hidden="true" />
        <span className="sr-only">Loading resumes…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {resumes.length === 0 ? (
        <p className="text-base-content/60 py-4 text-center text-sm">
          No resumes yet. Upload your first resume.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Resumes">
          {resumes.map((resume) => (
            <ResumeItem
              key={resume.id}
              resume={resume}
              disabled={disabled}
              onRemove={onRemove}
              onSetDefault={onSetDefault}
              onRename={onRename}
            />
          ))}
        </ul>
      )}

      {pendingFile ? (
        <div className="flex items-center gap-2 rounded-lg border border-base-300 p-3">
          <input
            type="text"
            className="input input-bordered input-sm flex-1"
            value={uploadLabel}
            onChange={(e) => setUploadLabel(e.target.value)}
            aria-label="Resume label"
            placeholder="Label for this resume"
            autoFocus
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleUploadSave}
            disabled={disabled || isUploading || !uploadLabel.trim()}
          >
            {isUploading ? 'Uploading…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleUploadCancel}
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>
      ) : (
        !atMax && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.rtf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Select resume file"
            />
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              Upload Resume
            </button>
          </>
        )
      )}
    </div>
  );
}
