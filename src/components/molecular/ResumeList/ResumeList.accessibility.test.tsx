import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ResumeList } from './ResumeList';
import type { Resume } from '@/lib/resumes/types';

expect.extend(toHaveNoViolations);

const makeResume = (overrides: Partial<Resume> = {}): Resume => ({
  id: 'resume-1',
  user_id: 'user-1',
  label: 'My Resume',
  storage_path: 'user-1/resume-1.pdf',
  file_name: 'resume.pdf',
  mime_type: 'application/pdf',
  file_size: 102400,
  is_default: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const noop = vi.fn().mockResolvedValue(undefined);

describe('ResumeList Accessibility', () => {
  it('has no violations in empty state', async () => {
    const { container } = render(
      <ResumeList
        resumes={[]}
        isLoading={false}
        onUpload={noop}
        onRemove={noop}
        onSetDefault={noop}
        onRename={noop}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with resumes', async () => {
    const { container } = render(
      <ResumeList
        resumes={[
          makeResume({ id: 'r1', label: 'Main CV', is_default: true }),
          makeResume({ id: 'r2', label: 'Backup CV', file_name: 'backup.pdf' }),
        ]}
        isLoading={false}
        onUpload={noop}
        onRemove={noop}
        onSetDefault={noop}
        onRename={noop}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations in disabled state', async () => {
    const { container } = render(
      <ResumeList
        resumes={[makeResume({ id: 'r1', label: 'Disabled CV' })]}
        isLoading={false}
        disabled={true}
        onUpload={noop}
        onRemove={noop}
        onSetDefault={noop}
        onRename={noop}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
