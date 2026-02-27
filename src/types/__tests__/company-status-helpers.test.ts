import { describe, it, expect } from 'vitest';
import {
  getStatusBadgeClass,
  getStatusLabel,
  JOB_STATUS_COLORS,
  JOB_STATUS_LABELS,
} from '../company';
import type { JobApplicationStatus } from '../company';

describe('getStatusBadgeClass', () => {
  it('returns correct class for each known status', () => {
    const statuses: JobApplicationStatus[] = [
      'not_applied',
      'applied',
      'screening',
      'interviewing',
      'offer',
      'closed',
    ];
    for (const status of statuses) {
      expect(getStatusBadgeClass(status)).toBe(JOB_STATUS_COLORS[status]);
    }
  });

  it('returns badge-ghost for unknown status', () => {
    expect(getStatusBadgeClass('some_future_status')).toBe('badge-ghost');
  });

  it('returns badge-ghost for empty string', () => {
    expect(getStatusBadgeClass('')).toBe('badge-ghost');
  });
});

describe('getStatusLabel', () => {
  it('returns correct label for each known status', () => {
    const statuses: JobApplicationStatus[] = [
      'not_applied',
      'applied',
      'screening',
      'interviewing',
      'offer',
      'closed',
    ];
    for (const status of statuses) {
      expect(getStatusLabel(status)).toBe(JOB_STATUS_LABELS[status]);
    }
  });

  it('returns the raw status string for unknown status', () => {
    expect(getStatusLabel('some_future_status')).toBe('some_future_status');
  });
});
