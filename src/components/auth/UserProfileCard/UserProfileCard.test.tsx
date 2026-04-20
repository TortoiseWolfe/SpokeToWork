import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserProfileCard from './UserProfileCard';

// Mock useUserProfile hook to return database profile
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: {
      id: 'test-user-id',
      display_name: 'Test User',
      bio: 'Test bio',
      avatar_url: null,
      role: 'worker',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock useMySkills to return two tagged skills by default
vi.mock('@/hooks/useMySkills', () => ({
  useMySkills: () => ({
    skills: [
      {
        id: 'tag-1',
        user_id: 'test-user-id',
        skill_id: 'skill-courier',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'tag-2',
        user_id: 'test-user-id',
        skill_id: 'skill-warehouse',
        is_primary: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
    addSkill: vi.fn(),
    removeSkill: vi.fn(),
    setPrimary: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock useSkills so resolveSkill returns a ResolvedSkill for known ids
vi.mock('@/hooks/useSkills', () => ({
  useSkills: () => ({
    skills: [],
    rows: [],
    tree: [],
    resolve: (id: string) => {
      if (id === 'skill-courier') {
        return {
          id,
          parent_id: null,
          slug: 'courier',
          name: 'Courier',
          color: 'primary',
          icon: 'user',
          ancestry: [],
        };
      }
      if (id === 'skill-warehouse') {
        return {
          id,
          parent_id: null,
          slug: 'warehouse',
          name: 'Warehouse',
          color: 'accent',
          icon: 'user',
          ancestry: [],
        };
      }
      return null;
    },
    isLoading: false,
    error: null,
  }),
}));

describe('UserProfileCard', () => {
  it('renders without crashing', () => {
    render(<UserProfileCard />);
    // With mocked profile, component should render the display_name
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays bio when available', () => {
    render(<UserProfileCard />);
    expect(screen.getByText('Test bio')).toBeInTheDocument();
  });

  it('renders skill badges for workers with tagged skills', () => {
    render(<UserProfileCard />);
    const row = screen.getByTestId('profile-skill-badges');
    expect(row).toBeInTheDocument();
    expect(screen.getByText('Courier')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
  });
});
