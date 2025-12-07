/**
 * CompanyMatchSuggestion Component Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T067 [US2] - Tests for CompanyMatchSuggestion displays match options
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompanyMatchSuggestion from './CompanyMatchSuggestion';
import type { MatchResult, MatchConfidence } from '@/types/company';

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

describe('CompanyMatchSuggestion', () => {
  describe('display', () => {
    it('renders match results', () => {
      const matches = [createMockMatch()];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText('Test Corp')).toBeInTheDocument();
    });

    it('renders multiple match results', () => {
      const matches = [
        createMockMatch({ company_id: '1', company_name: 'Company One' }),
        createMockMatch({ company_id: '2', company_name: 'Company Two' }),
      ];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText('Company One')).toBeInTheDocument();
      expect(screen.getByText('Company Two')).toBeInTheDocument();
    });

    it('displays company address', () => {
      const matches = [createMockMatch()];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(
        screen.getByText('123 Test St, Cleveland, TN 37311')
      ).toBeInTheDocument();
    });

    it('displays distance when available', () => {
      const matches = [createMockMatch({ distance_miles: 2.5 })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText(/2\.5 mi/)).toBeInTheDocument();
    });

    it('does not display distance when null', () => {
      const matches = [createMockMatch({ distance_miles: null })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.queryByText(/mi$/)).not.toBeInTheDocument();
    });
  });

  describe('confidence indicators', () => {
    it('displays high confidence badge', () => {
      const matches = [createMockMatch({ confidence: 'high' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('displays medium confidence badge', () => {
      const matches = [createMockMatch({ confidence: 'medium' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('displays low confidence badge', () => {
      const matches = [createMockMatch({ confidence: 'low' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('displays verified badge when company is verified', () => {
      const matches = [createMockMatch({ is_verified: true })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByTitle('Verified company')).toBeInTheDocument();
    });

    it('displays domain match indicator', () => {
      const matches = [createMockMatch({ domain_match: true })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByTitle('Domain matches')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('calls onTrack when "Track this one" is clicked', () => {
      const onTrack = vi.fn();
      const match = createMockMatch();
      render(<CompanyMatchSuggestion matches={[match]} onTrack={onTrack} />);

      fireEvent.click(screen.getByRole('button', { name: /track this/i }));
      expect(onTrack).toHaveBeenCalledWith(match);
    });

    it('calls onAddNew when "Add as new" is clicked', () => {
      const onAddNew = vi.fn();
      render(
        <CompanyMatchSuggestion
          matches={[createMockMatch()]}
          onAddNew={onAddNew}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add as new/i }));
      expect(onAddNew).toHaveBeenCalled();
    });

    it('disables track button when loading', () => {
      const matches = [createMockMatch()];
      render(<CompanyMatchSuggestion matches={matches} isLoading />);

      const trackButton = screen.getByRole('button', { name: /track this/i });
      expect(trackButton).toBeDisabled();
    });

    it('disables add new button when loading', () => {
      const matches = [createMockMatch()];
      render(<CompanyMatchSuggestion matches={matches} isLoading />);

      const addNewButton = screen.getByRole('button', { name: /add as new/i });
      expect(addNewButton).toBeDisabled();
    });
  });

  describe('empty state', () => {
    it('renders nothing when no matches provided', () => {
      const { container } = render(<CompanyMatchSuggestion matches={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('header', () => {
    it('displays suggestion header', () => {
      const matches = [createMockMatch()];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(screen.getByText(/similar company found/i)).toBeInTheDocument();
    });

    it('displays correct count in header', () => {
      const matches = [
        createMockMatch({ company_id: '1' }),
        createMockMatch({ company_id: '2' }),
      ];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(
        screen.getByText(/2 similar companies found/i)
      ).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const matches = [createMockMatch()];
      render(
        <CompanyMatchSuggestion matches={matches} className="custom-class" />
      );

      expect(screen.getByTestId('company-match-suggestion')).toHaveClass(
        'custom-class'
      );
    });

    it('applies high confidence styling', () => {
      const matches = [createMockMatch({ confidence: 'high' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      const badge = screen.getByText('High');
      expect(badge).toHaveClass('badge-success');
    });

    it('applies medium confidence styling', () => {
      const matches = [createMockMatch({ confidence: 'medium' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('badge-warning');
    });

    it('applies low confidence styling', () => {
      const matches = [createMockMatch({ confidence: 'low' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      const badge = screen.getByText('Low');
      expect(badge).toHaveClass('badge-ghost');
    });
  });

  describe('accessibility', () => {
    it('has accessible test id', () => {
      const matches = [createMockMatch()];
      render(
        <CompanyMatchSuggestion matches={matches} testId="custom-test-id" />
      );

      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
    });

    it('track button has accessible label', () => {
      const matches = [createMockMatch({ company_name: 'Acme Corp' })];
      render(<CompanyMatchSuggestion matches={matches} />);

      expect(
        screen.getByRole('button', { name: /track this/i })
      ).toBeInTheDocument();
    });
  });
});
