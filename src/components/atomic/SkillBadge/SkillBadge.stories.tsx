import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SkillBadge } from './SkillBadge';
import type { ResolvedSkill } from '@/types/worker';

const meta: Meta<typeof SkillBadge> = {
  title: 'Atomic/SkillBadge',
  component: SkillBadge,
};
export default meta;

const mkSkill = (name: string, color: ResolvedSkill['color']): ResolvedSkill => ({
  id: name, parent_id: null, slug: name.toLowerCase(), name,
  color, icon: 'user', ancestry: [name],
});

export const Courier: StoryObj<typeof SkillBadge> = { args: { skill: mkSkill('Courier', 'info') } };
export const Kitchen: StoryObj<typeof SkillBadge> = { args: { skill: mkSkill('Kitchen', 'error') } };
export const Warehouse: StoryObj<typeof SkillBadge> = { args: { skill: mkSkill('Warehouse', 'warning') } };
