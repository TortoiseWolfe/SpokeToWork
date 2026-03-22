'use client';

import React, { useMemo } from 'react';
import type { Resume } from '@/lib/resumes/types';

export interface ResumePickerProps {
  resumes: Resume[];
  selectedId: string | null;
  onSelect: (resumeId: string | null) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  return (bytes / 1024).toFixed(0) + ' KB';
}

export function ResumePicker({
  resumes,
  selectedId,
  onSelect,
  disabled = false,
}: ResumePickerProps) {
  const effectiveSelectedId = useMemo(() => {
    if (selectedId !== null) return selectedId;
    const defaultResume = resumes.find((r) => r.is_default);
    return defaultResume ? defaultResume.id : null;
  }, [selectedId, resumes]);

  if (resumes.length === 0) {
    return (
      <p className="text-base-content/60 py-4 text-sm">
        No resumes uploaded yet. Upload resumes in Account Settings.
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="Resume selection" className="flex flex-col gap-2">
      {resumes.map((resume) => (
        <div key={resume.id} className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="radio"
              className="radio radio-sm"
              name="resume-picker"
              value={resume.id}
              checked={effectiveSelectedId === resume.id}
              onChange={() => onSelect(resume.id)}
              disabled={disabled}
              aria-label={`${resume.label} — ${resume.file_name} (${formatFileSize(resume.file_size)})`}
            />
            <span className="label-text flex flex-col gap-0.5">
              <span className="font-medium">{resume.label}</span>
              <span className="text-base-content/60 text-xs">
                {resume.file_name} &bull; {formatFileSize(resume.file_size)}
              </span>
            </span>
          </label>
        </div>
      ))}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="radio"
            className="radio radio-sm"
            name="resume-picker"
            value=""
            checked={effectiveSelectedId === null}
            onChange={() => onSelect(null)}
            disabled={disabled}
            aria-label="None — don't attach a resume"
          />
          <span className="label-text text-base-content/70 italic">
            None — don&apos;t attach a resume
          </span>
        </label>
      </div>
    </div>
  );
}
