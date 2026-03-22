import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { SkillFilter } from './SkillFilter';
import type { SkillTreeNode } from '@/hooks/useSkills';

const tree: SkillTreeNode[] = [
  {
    node: { id: 'c', parent_id: null, slug: 'courier', name: 'Courier', color: 'info', icon: 'bike', sort_order: 1, created_at: '', updated_at: '' },
    children: [
      {
        node: { id: 'fd', parent_id: 'c', slug: 'food-delivery-rider', name: 'Food Delivery', color: null, icon: null, sort_order: 1, created_at: '', updated_at: '' },
        children: [],
      },
      {
        node: { id: 'pd', parent_id: 'c', slug: 'package-delivery', name: 'Package Delivery', color: null, icon: null, sort_order: 2, created_at: '', updated_at: '' },
        children: [],
      },
    ],
  },
];

const meta: Meta<typeof SkillFilter> = {
  title: 'Molecular/SkillFilter',
  component: SkillFilter,
};
export default meta;

export const Interactive: StoryObj<typeof SkillFilter> = {
  render: () => {
    const [sel, setSel] = useState<string[]>([]);
    return <SkillFilter tree={tree} selected={sel} onChange={setSel} />;
  },
};
