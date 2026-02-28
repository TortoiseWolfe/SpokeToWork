import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import StatusColumn from './StatusColumn';

expect.extend(toHaveNoViolations);

describe('StatusColumn Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={[]}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have region landmark with descriptive label', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={[]}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('region', { name: /applied applications/i })
    ).toBeInTheDocument();
  });

  it('should have proper heading hierarchy (h3)', () => {
    render(
      <StatusColumn
        status="applied"
        label="Applied"
        applications={[]}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
});
