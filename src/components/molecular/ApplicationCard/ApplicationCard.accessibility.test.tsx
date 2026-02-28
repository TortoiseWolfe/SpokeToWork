import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ApplicationCard from './ApplicationCard';

expect.extend(toHaveNoViolations);

const mockApp = {
  id: 'app-1',
  applicant_name: 'Jane Doe',
  company_name: 'Acme Corp',
  position_title: 'Software Engineer',
  status: 'applied' as const,
  date_applied: '2026-02-20',
};

describe('ApplicationCard Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('advance button has descriptive aria-label', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', {
        name: /advance jane doe to screening/i,
      })
    ).toBeInTheDocument();
  });

  it('reject button has descriptive aria-label', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', {
        name: /reject jane doe/i,
      })
    ).toBeInTheDocument();
  });

  it('advance button meets 44px touch target', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    const btn = screen.getByRole('button', { name: /advance/i });
    expect(btn.className).toContain('min-h-11');
  });

  it('reject button meets 44px touch target', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    const btn = screen.getByRole('button', { name: /reject/i });
    expect(btn.className).toContain('min-h-11');
  });

  it('date picker input has accessible label', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'screening' }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /advance.*interviewing/i }));
    expect(screen.getByLabelText(/interview date/i)).toBeInTheDocument();
  });

  it('should have no violations with date picker visible', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const { container } = render(
      <ApplicationCard
        application={{ ...mockApp, status: 'screening' }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /advance.*interviewing/i }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
