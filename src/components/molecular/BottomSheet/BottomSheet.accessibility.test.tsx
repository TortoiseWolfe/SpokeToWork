import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <BottomSheet ariaLabel="Company list">
        <p>content</p>
      </BottomSheet>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
