import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ResumePicker } from './ResumePicker';
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

describe('ResumePicker Accessibility', () => {
  it('has no violations in empty state', async () => {
    const { container } = render(
      <ResumePicker resumes={[]} selectedId={null} onSelect={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with resumes', async () => {
    const { container } = render(
      <ResumePicker
        resumes={[
          makeResume({ id: 'r1', label: 'Main CV', is_default: true }),
          makeResume({ id: 'r2', label: 'Backup CV', file_name: 'backup.pdf' }),
        ]}
        selectedId={null}
        onSelect={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations in disabled state', async () => {
    const { container } = render(
      <ResumePicker
        resumes={[makeResume({ id: 'r1', label: 'Disabled CV' })]}
        selectedId="r1"
        onSelect={() => {}}
        disabled={true}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
