import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumePicker } from './ResumePicker';
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
  selectedId: null,
  onSelect: vi.fn(),
};

describe('ResumePicker', () => {
  it('renders radio buttons for each resume', () => {
    const resumes = [
      makeResume({ id: 'r1', label: 'Engineering CV' }),
      makeResume({ id: 'r2', label: 'Senior Developer' }),
    ];
    render(<ResumePicker {...defaultProps} resumes={resumes} />);

    const radios = screen.getAllByRole('radio');
    // 2 resumes + 1 "None" option
    expect(radios).toHaveLength(3);
    expect(screen.getByText('Engineering CV')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
  });

  it('renders "None" option', () => {
    const resumes = [makeResume()];
    render(<ResumePicker {...defaultProps} resumes={resumes} />);
    expect(screen.getByText(/None — don't attach a resume/)).toBeInTheDocument();
  });

  it('pre-selects default resume when no selectedId', () => {
    const resumes = [
      makeResume({ id: 'r1', label: 'Regular', is_default: false }),
      makeResume({ id: 'r2', label: 'Default CV', is_default: true }),
    ];
    render(<ResumePicker {...defaultProps} resumes={resumes} selectedId={null} />);

    const radios = screen.getAllByRole('radio');
    // The "Default CV" radio (index 1) should be checked
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked(); // None option
  });

  it('pre-selects the given selectedId', () => {
    const resumes = [
      makeResume({ id: 'r1', label: 'First CV' }),
      makeResume({ id: 'r2', label: 'Second CV' }),
    ];
    render(<ResumePicker {...defaultProps} resumes={resumes} selectedId="r1" />);

    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
  });

  it('calls onSelect with resume id on click', () => {
    const onSelect = vi.fn();
    const resumes = [
      makeResume({ id: 'r1', label: 'First CV' }),
      makeResume({ id: 'r2', label: 'Second CV' }),
    ];
    render(<ResumePicker {...defaultProps} resumes={resumes} onSelect={onSelect} />);

    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(onSelect).toHaveBeenCalledWith('r2');
  });

  it('calls onSelect with null for "None"', () => {
    const onSelect = vi.fn();
    const resumes = [makeResume({ id: 'r1', label: 'My Resume' })];
    // Start with a resume selected so "None" is not already checked
    render(<ResumePicker {...defaultProps} resumes={resumes} selectedId="r1" onSelect={onSelect} />);

    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[radios.length - 1]); // last radio is "None"
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('renders empty state message when no resumes', () => {
    render(<ResumePicker {...defaultProps} resumes={[]} />);
    expect(
      screen.getByText('No resumes uploaded yet. Upload resumes in Account Settings.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('disables radios when disabled prop is true', () => {
    const resumes = [
      makeResume({ id: 'r1', label: 'My Resume' }),
    ];
    render(<ResumePicker {...defaultProps} resumes={resumes} disabled={true} />);

    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });
});
