import { describe, it, expect } from 'vitest';
import { buildResolver, toIndustry } from '@/hooks/useIndustries';
import type { Industry } from '@/types/company';

const fixture: Industry[] = [
  { id: 'root', parent_id: null, slug: 'root', name: 'Root', color: 'info', icon: 'truck', sort_order: 0, created_at: '', updated_at: '' },
  { id: 'mid',  parent_id: 'root', slug: 'mid',  name: 'Mid',  color: null,   icon: null,    sort_order: 0, created_at: '', updated_at: '' },
  { id: 'leaf', parent_id: 'mid',  slug: 'leaf', name: 'Leaf', color: null,   icon: 'bike',  sort_order: 0, created_at: '', updated_at: '' },
];

describe('buildResolver', () => {
  it('inherits color through two levels of null', () => {
    const resolve = buildResolver(fixture);
    expect(resolve('leaf')?.color).toBe('info'); // walked leaf→mid→root
  });

  it('uses own icon when set, even if parent also has one', () => {
    const resolve = buildResolver(fixture);
    expect(resolve('leaf')?.icon).toBe('bike');
  });

  it('inherits icon when own is null', () => {
    const resolve = buildResolver(fixture);
    expect(resolve('mid')?.icon).toBe('truck');
  });

  it('builds ancestry path root→leaf', () => {
    const resolve = buildResolver(fixture);
    expect(resolve('leaf')?.ancestry).toEqual(['Root', 'Mid', 'Leaf']);
  });

  it('returns null for unknown id', () => {
    const resolve = buildResolver(fixture);
    expect(resolve('nope')).toBeNull();
  });

  it('falls back to primary/building when entire chain is null', () => {
    const orphan: Industry[] = [
      { id: 'x', parent_id: null, slug: 'x', name: 'X', color: null, icon: null, sort_order: 0, created_at: '', updated_at: '' },
    ];
    const resolve = buildResolver(orphan);
    expect(resolve('x')?.color).toBe('primary');
    expect(resolve('x')?.icon).toBe('building');
  });

  it('terminates on parent_id cycle instead of spinning', () => {
    const cycle: Industry[] = [
      { id: 'a', parent_id: 'b', slug: 'a', name: 'A', color: null, icon: null, sort_order: 0, created_at: '', updated_at: '' },
      { id: 'b', parent_id: 'a', slug: 'b', name: 'B', color: null, icon: null, sort_order: 0, created_at: '', updated_at: '' },
    ];
    const resolve = buildResolver(cycle);
    // Not asserting ancestry shape — just that it returns at all.
    expect(resolve('a')).not.toBeNull();
  });
});

describe('toIndustry', () => {
  it('passes through valid color tokens', () => {
    const row = { id: 'a', parent_id: null, slug: 'a', name: 'A', color: 'info', icon: null, sort_order: 0, created_at: '', updated_at: '' };
    expect(toIndustry(row).color).toBe('info');
  });

  it('nulls out unrecognized color so resolver inheritance kicks in', () => {
    const row = { id: 'a', parent_id: null, slug: 'a', name: 'A', color: 'purple', icon: null, sort_order: 0, created_at: '', updated_at: '' };
    expect(toIndustry(row).color).toBeNull();
  });

  it('preserves null color', () => {
    const row = { id: 'a', parent_id: null, slug: 'a', name: 'A', color: null, icon: null, sort_order: 0, created_at: '', updated_at: '' };
    expect(toIndustry(row).color).toBeNull();
  });
});
