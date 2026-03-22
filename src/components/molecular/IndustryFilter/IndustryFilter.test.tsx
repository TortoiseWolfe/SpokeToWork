import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IndustryFilter } from './IndustryFilter';
import type { IndustryTreeNode } from '@/hooks/useIndustries';
import type { Industry } from '@/types/company';

const mk = (id: string, name: string, parent_id: string | null = null): Industry => ({
  id, parent_id, slug: id, name, color: null, icon: null, sort_order: 0, created_at: '', updated_at: '',
});

const tree: IndustryTreeNode[] = [
  {
    industry: mk('t', 'Transportation'),
    children: [
      { industry: mk('d', 'Delivery', 't'), children: [] },
    ],
  },
];

describe('IndustryFilter', () => {
  it('renders root industries as options', () => {
    render(<IndustryFilter tree={tree} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Transportation')).toBeInTheDocument();
  });

  it('renders children indented under parents', () => {
    render(<IndustryFilter tree={tree} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Delivery')).toBeInTheDocument();
  });

  it('calls onChange with id toggled in', () => {
    const onChange = vi.fn();
    render(<IndustryFilter tree={tree} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Transportation'));
    expect(onChange).toHaveBeenCalledWith(['t']);
  });

  it('calls onChange with id toggled out', () => {
    const onChange = vi.fn();
    render(<IndustryFilter tree={tree} selected={['t']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Transportation'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('toggling one id preserves others', () => {
    const onChange = vi.fn();
    render(<IndustryFilter tree={tree} selected={['t', 'd']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Delivery'));
    expect(onChange).toHaveBeenCalledWith(['t']);
  });

  it('shows selected count badge', () => {
    render(<IndustryFilter tree={tree} selected={['t', 'd']} onChange={vi.fn()} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('clear button empties selection', () => {
    const onChange = vi.fn();
    render(<IndustryFilter tree={tree} selected={['t']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
