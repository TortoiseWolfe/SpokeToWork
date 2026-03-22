import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkerCard } from './WorkerCard';
import type { DiscoverableWorker, ResolvedSkill } from '@/types/worker';

const meta: Meta<typeof WorkerCard> = {
  title: 'Molecular/WorkerCard',
  component: WorkerCard,
};
export default meta;

const courierSkill: ResolvedSkill = {
  id: 'c', parent_id: null, slug: 'courier', name: 'Courier',
  color: 'info', icon: 'bike', ancestry: ['Courier'],
};

const worker: DiscoverableWorker = {
  id: 'w1', username: 'alice', display_name: 'Alice Rider',
  avatar_url: null, bio: 'Bicycle courier, 5 years experience.',
  primary_skill_id: 'c',
  user_skills: [{ id: 'us1', user_id: 'w1', skill_id: 'c', is_primary: true, created_at: '' }],
};

export const Default: StoryObj<typeof WorkerCard> = {
  render: () => <WorkerCard worker={worker} resolveSkill={() => courierSkill} />,
};
