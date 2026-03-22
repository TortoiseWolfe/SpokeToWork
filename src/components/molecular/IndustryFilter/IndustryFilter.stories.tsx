import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { IndustryFilter } from './IndustryFilter';
import type { IndustryTreeNode } from '@/hooks/useIndustries';

const tree: IndustryTreeNode[] = [
  {
    node: { id: 't', parent_id: null, slug: 'transportation', name: 'Transportation', color: 'info', icon: 'truck', sort_order: 1, created_at: '', updated_at: '' },
    children: [
      { node: { id: 'd', parent_id: 't', slug: 'delivery', name: 'Delivery & Logistics', color: null, icon: null, sort_order: 1, created_at: '', updated_at: '' },
        children: [
          { node: { id: 'b', parent_id: 'd', slug: 'bicycle-courier', name: 'Bicycle Courier', color: null, icon: null, sort_order: 1, created_at: '', updated_at: '' }, children: [] },
        ],
      },
    ],
  },
];

const meta: Meta<typeof IndustryFilter> = {
  title: 'Molecular/IndustryFilter',
  component: IndustryFilter,
};
export default meta;

export const Interactive: StoryObj<typeof IndustryFilter> = {
  render: () => {
    const [sel, setSel] = useState<string[]>([]);
    return <IndustryFilter tree={tree} selected={sel} onChange={setSel} />;
  },
};
