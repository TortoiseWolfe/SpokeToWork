import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import RoleToggle from './RoleToggle';
import type { UserRole } from './RoleToggle';

const meta: Meta<typeof RoleToggle> = {
  title: 'Molecular/RoleToggle',
  component: RoleToggle,
};

export default meta;

function Interactive({ initial = 'worker' }: { initial?: UserRole }) {
  const [role, setRole] = useState<UserRole>(initial);
  return <RoleToggle value={role} onChange={setRole} />;
}

export const Worker: StoryObj = {
  render: () => <Interactive initial="worker" />,
};

export const Employer: StoryObj = {
  render: () => <Interactive initial="employer" />,
};
