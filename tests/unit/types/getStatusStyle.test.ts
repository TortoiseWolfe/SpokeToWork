import { describe, it, expect } from 'vitest';
import { getStatusStyle } from '@/types/company';

describe('getStatusStyle', () => {
  it('returns known label + color class for a known status', () => {
    expect(getStatusStyle('screening')).toEqual({
      label: 'Screening',
      className: 'badge-warning',
    });
  });

  it('returns known values for all six statuses', () => {
    expect(getStatusStyle('applied').className).toBe('badge-info');
    expect(getStatusStyle('interviewing').className).toBe('badge-primary');
    expect(getStatusStyle('offer').className).toBe('badge-success');
    expect(getStatusStyle('closed').className).toBe('badge-neutral');
    expect(getStatusStyle('not_applied').className).toBe('badge-ghost');
  });

  it('falls back to neutral + raw string for unknown status', () => {
    expect(getStatusStyle('archived')).toEqual({
      label: 'archived',
      className: 'badge-neutral',
    });
  });

  it('falls back to "Unknown" label for empty string', () => {
    expect(getStatusStyle('')).toEqual({
      label: 'Unknown',
      className: 'badge-neutral',
    });
  });
});
