import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResumeList } from './ResumeList';
import type { Resume } from '@/lib/resumes/types';

const meta: Meta<typeof ResumeList> = {
  title: 'Molecular/ResumeList',
  component: ResumeList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays a list of uploaded resumes with upload, rename, remove, and set-default actions.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ResumeList>;

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

const noop = () => Promise.resolve();

export const Empty: Story = {
  args: {
    resumes: [],
    isLoading: false,
    onUpload: noop,
    onRemove: noop,
    onSetDefault: noop,
    onRename: noop,
  },
};

export const OneResume: Story = {
  args: {
    resumes: [makeResume({ label: 'Software Engineer CV', file_size: 245760 })],
    isLoading: false,
    onUpload: noop,
    onRemove: noop,
    onSetDefault: noop,
    onRename: noop,
  },
};

export const MultipleResumes: Story = {
  args: {
    resumes: [
      makeResume({ id: 'r1', label: 'Software Engineer CV', is_default: true, file_size: 245760 }),
      makeResume({ id: 'r2', label: 'Senior Developer', file_name: 'senior.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', file_size: 87040 }),
      makeResume({ id: 'r3', label: 'Consulting Resume', file_name: 'consulting.pdf', file_size: 1572864 }),
    ],
    isLoading: false,
    onUpload: noop,
    onRemove: noop,
    onSetDefault: noop,
    onRename: noop,
  },
};

export const AtLimit: Story = {
  args: {
    resumes: Array.from({ length: 5 }, (_, i) =>
      makeResume({
        id: `r${i}`,
        label: `Resume ${i + 1}`,
        is_default: i === 0,
        file_size: 100000 + i * 50000,
      })
    ),
    isLoading: false,
    onUpload: noop,
    onRemove: noop,
    onSetDefault: noop,
    onRename: noop,
  },
};

export const Disabled: Story = {
  args: {
    resumes: [
      makeResume({ id: 'r1', label: 'Main Resume', is_default: true }),
      makeResume({ id: 'r2', label: 'Backup Resume' }),
    ],
    isLoading: false,
    disabled: true,
    onUpload: noop,
    onRemove: noop,
    onSetDefault: noop,
    onRename: noop,
  },
};

export const Loading: Story = {
  args: {
    resumes: [],
    isLoading: true,
    onUpload: noop,
    onRemove: noop,
    onSetDefault: noop,
    onRename: noop,
  },
};

function InteractiveWrapper() {
  const [resumes, setResumes] = useState<Resume[]>([
    makeResume({ id: 'r1', label: 'Main Resume', is_default: true }),
  ]);

  const handleUpload = async (file: File, label: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setResumes((prev) => [
      ...prev,
      {
        id: `r${Date.now()}`,
        user_id: 'user-1',
        label,
        storage_path: `user-1/${file.name}`,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        is_default: prev.length === 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  };

  const handleRemove = async (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    setResumes((prev) =>
      prev.map((r) => ({ ...r, is_default: r.id === id }))
    );
  };

  const handleRename = async (id: string, label: string) => {
    setResumes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, label } : r))
    );
  };

  return (
    <ResumeList
      resumes={resumes}
      isLoading={false}
      onUpload={handleUpload}
      onRemove={handleRemove}
      onSetDefault={handleSetDefault}
      onRename={handleRename}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractiveWrapper />,
};
