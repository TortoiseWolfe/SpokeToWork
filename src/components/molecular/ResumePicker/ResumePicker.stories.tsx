import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResumePicker } from './ResumePicker';
import type { Resume } from '@/lib/resumes/types';

const meta: Meta<typeof ResumePicker> = {
  title: 'Molecular/ResumePicker',
  component: ResumePicker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Radio group for selecting a resume to attach to a job application. Includes a "None" option to opt out.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ResumePicker>;

const makeResume = (overrides: Partial<Resume> = {}): Resume => ({
  id: 'resume-1',
  user_id: 'user-1',
  label: 'My Resume',
  storage_path: 'user-1/resume-1.pdf',
  file_name: 'resume.pdf',
  mime_type: 'application/pdf',
  file_size: 153600,
  is_default: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const NoResumes: Story = {
  args: {
    resumes: [],
    selectedId: null,
    onSelect: () => {},
  },
};

export const WithResumes: Story = {
  args: {
    resumes: [
      makeResume({ id: 'r1', label: 'Software Engineer CV', is_default: true, file_size: 245760 }),
      makeResume({
        id: 'r2',
        label: 'Senior Developer',
        file_name: 'senior.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 87040,
      }),
      makeResume({ id: 'r3', label: 'Consulting Resume', file_name: 'consulting.pdf', file_size: 1572864 }),
    ],
    selectedId: null,
    onSelect: () => {},
  },
};

export const WithSelection: Story = {
  args: {
    resumes: [
      makeResume({ id: 'r1', label: 'Software Engineer CV', is_default: true, file_size: 245760 }),
      makeResume({ id: 'r2', label: 'Senior Developer', file_name: 'senior.docx', file_size: 87040 }),
    ],
    selectedId: 'r2',
    onSelect: () => {},
  },
};

export const Disabled: Story = {
  args: {
    resumes: [
      makeResume({ id: 'r1', label: 'Main Resume', is_default: true }),
      makeResume({ id: 'r2', label: 'Backup Resume', file_name: 'backup.pdf' }),
    ],
    selectedId: 'r1',
    onSelect: () => {},
    disabled: true,
  },
};

function InteractiveWrapper() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="max-w-sm">
      <ResumePicker
        resumes={[
          makeResume({ id: 'r1', label: 'Software Engineer CV', is_default: true, file_size: 245760 }),
          makeResume({ id: 'r2', label: 'Senior Developer', file_name: 'senior.docx', file_size: 87040 }),
          makeResume({ id: 'r3', label: 'Consulting Resume', file_name: 'consulting.pdf', file_size: 1572864 }),
        ]}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <p className="mt-4 text-sm">
        Selected: <code>{selectedId ?? 'null'}</code>
      </p>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveWrapper />,
};
