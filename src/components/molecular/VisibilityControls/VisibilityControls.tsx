'use client';

import React from 'react';

export type ResumeVisibility = 'none' | 'applied' | 'all_employers';

export interface VisibilityControlsProps {
  profilePublic: boolean;
  resumeVisibleTo: ResumeVisibility;
  onChange: (
    changes: Partial<{
      profile_public: boolean;
      resume_visible_to: ResumeVisibility;
    }>
  ) => void;
  disabled?: boolean;
}

const RESUME_OPTIONS: {
  value: ResumeVisibility;
  label: string;
  helper: string;
}[] = [
  {
    value: 'none',
    label: 'Private',
    helper: 'Only you can see your resumes',
  },
  {
    value: 'applied',
    label: 'Applied',
    helper: 'Employers you applied to can download',
  },
  {
    value: 'all_employers',
    label: 'All employers',
    helper: 'Any employer can download your default resume',
  },
];

/**
 * VisibilityControls — toggle + radio group for profile and resume visibility settings
 *
 * @category molecular
 */
export function VisibilityControls({
  profilePublic,
  resumeVisibleTo,
  onChange,
  disabled = false,
}: VisibilityControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Profile visibility toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="toggle"
            checked={profilePublic}
            disabled={disabled}
            onChange={(e) => onChange({ profile_public: e.target.checked })}
            aria-label="Profile visible to employers"
          />
          <span className="label-text">Profile visible to employers</span>
        </label>
      </div>

      {/* Resume visibility radio group */}
      <fieldset disabled={disabled}>
        <legend className="label-text font-medium mb-2">
          Resume visibility
        </legend>
        <div className="flex flex-col gap-2">
          {RESUME_OPTIONS.map((option) => (
            <div key={option.value} className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="resume_visible_to"
                  value={option.value}
                  checked={resumeVisibleTo === option.value}
                  disabled={disabled}
                  onChange={() =>
                    onChange({ resume_visible_to: option.value })
                  }
                  className="radio radio-sm"
                  aria-label={option.label}
                />
                <span className="flex flex-col">
                  <span className="label-text">{option.label}</span>
                  <span className="text-sm text-base-content/60">
                    {option.helper}
                  </span>
                </span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
