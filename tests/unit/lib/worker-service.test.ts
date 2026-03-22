import { describe, it, expect } from 'vitest';
import { resolvePrimarySkillId } from '@/lib/workers/worker-service';

describe('resolvePrimarySkillId', () => {
  it('returns null for empty array', () => {
    expect(resolvePrimarySkillId([])).toBeNull();
  });

  it('returns the explicit primary skill', () => {
    const skills = [
      { skill_id: 'a', is_primary: false, created_at: '2024-01-01' },
      { skill_id: 'b', is_primary: true,  created_at: '2024-01-02' },
    ];
    expect(resolvePrimarySkillId(skills)).toBe('b');
  });

  it('falls back to oldest when no skill is marked primary', () => {
    const skills = [
      { skill_id: 'b', is_primary: false, created_at: '2024-01-02' },
      { skill_id: 'a', is_primary: false, created_at: '2024-01-01' },
    ];
    expect(resolvePrimarySkillId(skills)).toBe('a');
  });

  it('explicit primary wins over older skill', () => {
    const skills = [
      { skill_id: 'old', is_primary: false, created_at: '2023-01-01' },
      { skill_id: 'new', is_primary: true,  created_at: '2024-01-01' },
    ];
    expect(resolvePrimarySkillId(skills)).toBe('new');
  });
});
