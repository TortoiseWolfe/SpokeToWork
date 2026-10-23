import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import ChunkLoadRecovery from './ChunkLoadRecovery';

describe('ChunkLoadRecovery Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ChunkLoadRecovery />);
    expect(container).toBeEmptyDOMElement();
    expect(await axe(container)).toHaveNoViolations();
  });
});
