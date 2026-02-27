import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import RoleToggle from './RoleToggle';

describe('RoleToggle', () => {
  it('renders two radio buttons', () => {
    render(<RoleToggle value="worker" onChange={vi.fn()} />);
    expect(
      screen.getByRole('radio', { name: /looking for work/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /hiring/i })).toBeInTheDocument();
  });

  it('checks the worker radio when value is worker', () => {
    render(<RoleToggle value="worker" onChange={vi.fn()} />);
    expect(
      screen.getByRole('radio', { name: /looking for work/i })
    ).toBeChecked();
    expect(screen.getByRole('radio', { name: /hiring/i })).not.toBeChecked();
  });

  it('checks the employer radio when value is employer', () => {
    render(<RoleToggle value="employer" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /hiring/i })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: /looking for work/i })
    ).not.toBeChecked();
  });

  it('calls onChange with employer when hiring clicked', async () => {
    const onChange = vi.fn();
    render(<RoleToggle value="worker" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /hiring/i }));
    expect(onChange).toHaveBeenCalledWith('employer');
  });

  it('calls onChange with worker when looking for work clicked', async () => {
    const onChange = vi.fn();
    render(<RoleToggle value="employer" onChange={onChange} />);
    await userEvent.click(
      screen.getByRole('radio', { name: /looking for work/i })
    );
    expect(onChange).toHaveBeenCalledWith('worker');
  });

  it('applies className prop', () => {
    const { container } = render(
      <RoleToggle value="worker" onChange={vi.fn()} className="mt-4" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });

  it('has accessible radiogroup role with label', () => {
    render(<RoleToggle value="worker" onChange={vi.fn()} />);
    expect(
      screen.getByRole('radiogroup', { name: /i am/i })
    ).toBeInTheDocument();
  });
});
