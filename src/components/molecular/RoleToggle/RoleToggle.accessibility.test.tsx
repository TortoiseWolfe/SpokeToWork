import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import RoleToggle from './RoleToggle';

expect.extend(toHaveNoViolations);

describe('RoleToggle accessibility', () => {
  it('has no axe violations with worker selected', async () => {
    const { container } = render(
      <RoleToggle value="worker" onChange={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with employer selected', async () => {
    const { container } = render(
      <RoleToggle value="employer" onChange={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
