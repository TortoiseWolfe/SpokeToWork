'use client';

import React from 'react';

export type UserRole = 'worker' | 'employer';

export interface RoleToggleProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  className?: string;
}

/**
 * RoleToggle — segmented radio for choosing user type at signup
 *
 * @category molecular
 */
export default function RoleToggle({
  value,
  onChange,
  className = '',
}: RoleToggleProps) {
  return (
    <fieldset
      role="radiogroup"
      aria-label="I am"
      className={`join w-full ${className}`}
    >
      <label
        className={`join-item btn btn-sm min-h-11 flex-1 ${value === 'worker' ? 'btn-primary' : 'btn-ghost'}`}
      >
        <input
          type="radio"
          name="role"
          value="worker"
          checked={value === 'worker'}
          onChange={() => onChange('worker')}
          className="sr-only"
          aria-label="I'm looking for work"
        />
        I&apos;m looking for work
      </label>
      <label
        className={`join-item btn btn-sm min-h-11 flex-1 ${value === 'employer' ? 'btn-primary' : 'btn-ghost'}`}
      >
        <input
          type="radio"
          name="role"
          value="employer"
          checked={value === 'employer'}
          onChange={() => onChange('employer')}
          className="sr-only"
          aria-label="I'm hiring"
        />
        I&apos;m hiring
      </label>
    </fieldset>
  );
}
