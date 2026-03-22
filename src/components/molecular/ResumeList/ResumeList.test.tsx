import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumeList } from './ResumeList';
import type { Resume } from '@/lib/resumes/types';

const makeResume = (overrides: Partial<Resume> = {}): Resume => ({
  id: 'resume-1',
  user_id: 'user-1',
  label: 'My Resume',
  storage_path: 'user-1/resume-1.pdf',
  file_name: 'resume.pdf',
  mime_type: 'application/pdf',
  file_size: 102400, // 100 KB
  is_default: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const defaultProps = {
  resumes: [],
  isLoading: false,
  onUpload: vi.fn().mockResolvedValue(undefined),
  onRemove: vi.fn().mockResolvedValue(undefined),
  onSetDefault: vi.fn().mockResolvedValue(undefined),
  onRename: vi.fn().mockResolvedValue(undefined),
};

describe('ResumeList', () => {
  it('renders empty state when no resumes', () => {
    render(<ResumeList {...defaultProps} />);
    expect(
      screen.getByText('No resumes yet. Upload your first resume.')
    ).toBeInTheDocument();
  });

  it('renders resume items with label, filename, size', () => {
    const resumes = [
      makeResume({ label: 'Engineering CV', file_name: 'eng-cv.pdf', file_size: 204800 }),
    ];
    render(<ResumeList {...defaultProps} resumes={resumes} />);
    expect(screen.getByText('Engineering CV')).toBeInTheDocument();
    expect(screen.getByText(/eng-cv\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/200 KB/)).toBeInTheDocument();
  });

  it('shows default badge on default resume', () => {
    const resumes = [makeResume({ is_default: true, label: 'Default CV' })];
    render(<ResumeList {...defaultProps} resumes={resumes} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('calls onUpload when upload flow completed (file selected + label entered + save)', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<ResumeList {...defaultProps} onUpload={onUpload} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Trigger file selection directly
    const file = new File(['content'], 'my-cv.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Label input should appear pre-filled with filename stem
    const labelInput = await screen.findByRole('textbox', { name: /resume label/i });
    expect(labelInput).toBeInTheDocument();

    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, 'My New CV');

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file, 'My New CV');
    });
  });

  it('calls onRemove when remove clicked', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const resumes = [makeResume({ id: 'resume-42', label: 'Old Resume' })];
    render(<ResumeList {...defaultProps} resumes={resumes} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: /remove old resume/i }));

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith('resume-42');
    });
  });

  it('calls onSetDefault when set-default clicked', async () => {
    const onSetDefault = vi.fn().mockResolvedValue(undefined);
    const resumes = [makeResume({ id: 'resume-7', label: 'Side Resume', is_default: false })];
    render(<ResumeList {...defaultProps} resumes={resumes} onSetDefault={onSetDefault} />);

    fireEvent.click(screen.getByRole('button', { name: /set side resume as default/i }));

    await waitFor(() => {
      expect(onSetDefault).toHaveBeenCalledWith('resume-7');
    });
  });

  it('calls onRename with new label', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    const resumes = [makeResume({ id: 'resume-3', label: 'Old Label' })];
    render(<ResumeList {...defaultProps} resumes={resumes} onRename={onRename} />);

    fireEvent.click(screen.getByRole('button', { name: /rename old label/i }));

    const input = screen.getByRole('textbox', { name: /new resume label/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated Label');

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith('resume-3', 'Updated Label');
    });
  });

  it('hides upload button when at max (5 resumes)', () => {
    const resumes = Array.from({ length: 5 }, (_, i) =>
      makeResume({ id: `resume-${i}`, label: `Resume ${i}` })
    );
    render(<ResumeList {...defaultProps} resumes={resumes} />);
    expect(
      screen.queryByRole('button', { name: /upload resume/i })
    ).not.toBeInTheDocument();
  });

  it('disables actions when disabled prop is true', () => {
    const resumes = [makeResume({ label: 'Test Resume', is_default: false })];
    render(<ResumeList {...defaultProps} resumes={resumes} disabled={true} />);

    expect(screen.getByRole('button', { name: /rename test resume/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove test resume/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /set test resume as default/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /upload resume/i })).toBeDisabled();
  });
});
