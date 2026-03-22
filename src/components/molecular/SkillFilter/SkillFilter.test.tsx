import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillFilter } from './SkillFilter';
import type { SkillTreeNode } from '@/hooks/useSkills';
import type { Skill } from '@/types/worker';

const mk = (id: string, name: string, parent_id: string | null = null): Skill => ({
  id, parent_id, slug: id, name, color: null, icon: null, sort_order: 0, created_at: '', updated_at: '',
});

const tree: SkillTreeNode[] = [
  {
    node: mk('c', 'Courier'),
    children: [
      { node: mk('fd', 'Food Delivery', 'c'), children: [] },
    ],
  },
];

describe('SkillFilter', () => {
  it('renders root skills as options', () => {
    render(<SkillFilter tree={tree} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Courier')).toBeInTheDocument();
  });

  it('renders children indented under parents', () => {
    render(<SkillFilter tree={tree} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Food Delivery')).toBeInTheDocument();
  });

  it('calls onChange with id toggled in', () => {
    const onChange = vi.fn();
    render(<SkillFilter tree={tree} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Courier'));
    expect(onChange).toHaveBeenCalledWith(['c']);
  });

  it('calls onChange with id toggled out', () => {
    const onChange = vi.fn();
    render(<SkillFilter tree={tree} selected={['c']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Courier'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('toggling one id preserves others', () => {
    const onChange = vi.fn();
    render(<SkillFilter tree={tree} selected={['c', 'fd']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Food Delivery'));
    expect(onChange).toHaveBeenCalledWith(['c']);
  });

  it('shows selected count badge', () => {
    render(<SkillFilter tree={tree} selected={['c', 'fd']} onChange={vi.fn()} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('clear button empties selection', () => {
    const onChange = vi.fn();
    render(<SkillFilter tree={tree} selected={['c']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
