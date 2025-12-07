/**
 * CompanyMatchSuggestion Accessibility Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * Tests for WCAG 2.1 compliance
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyMatchSuggestion from './CompanyMatchSuggestion';
import type { MatchResult, MatchConfidence } from '@/types/company';

expect.extend(toHaveNoViolations);

const createMockMatch = (
  overrides: Partial<MatchResult> = {}
): MatchResult => ({
  company_id: 'company-123',
  company_name: 'Test Corp',
  website: 'https://testcorp.com',
  careers_url: 'https://testcorp.com/careers',
  is_verified: true,
  location_id: 'loc-123',
  address: '123 Test St, Cleveland, TN 37311',
  distance_miles: 2.5,
  name_similarity: 0.85,
  domain_match: false,
  confidence: 'high' as MatchConfidence,
  ...overrides,
});

describe('CompanyMatchSuggestion Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const matches = [
      createMockMatch({ company_id: '1', company_name: 'Company One' }),
      createMockMatch({ company_id: '2', company_name: 'Company Two' }),
    ];

    const { container } = render(<CompanyMatchSuggestion matches={matches} />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('buttons have accessible labels', () => {
    const matches = [createMockMatch()];
    render(<CompanyMatchSuggestion matches={matches} />);

    const trackButton = screen.getByRole('button', { name: /track this/i });
    const addNewButton = screen.getByRole('button', { name: /add as new/i });

    expect(trackButton).toBeInTheDocument();
    expect(addNewButton).toBeInTheDocument();
  });

  it('verified badge has title for screen readers', () => {
    const matches = [createMockMatch({ is_verified: true })];
    render(<CompanyMatchSuggestion matches={matches} />);

    expect(screen.getByTitle('Verified company')).toBeInTheDocument();
  });

  it('domain match badge has title for screen readers', () => {
    const matches = [createMockMatch({ domain_match: true })];
    render(<CompanyMatchSuggestion matches={matches} />);

    expect(screen.getByTitle('Domain matches')).toBeInTheDocument();
  });

  it('disabled buttons have proper aria state', () => {
    const matches = [createMockMatch()];
    render(<CompanyMatchSuggestion matches={matches} isLoading />);

    const trackButton = screen.getByRole('button', { name: /track this/i });
    const addNewButton = screen.getByRole('button', { name: /add as new/i });

    expect(trackButton).toBeDisabled();
    expect(addNewButton).toBeDisabled();
  });

  it('has semantic heading for suggestion section', () => {
    const matches = [createMockMatch()];
    render(<CompanyMatchSuggestion matches={matches} />);

    expect(
      screen.getByRole('heading', { level: 3, name: /similar.*found/i })
    ).toBeInTheDocument();
  });
});
