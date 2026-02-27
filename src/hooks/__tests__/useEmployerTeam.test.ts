/**
 * Unit tests for useEmployerTeam — Feature 064
 * Optimistic add/remove of team members with rollback on error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// --- Mock setup ----------------------------------------------------------

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'employer-1' } },
        error: null,
      }),
    },
    rpc: mockRpc,
  })),
}));

// Import AFTER mocks
import { useEmployerTeam, type TeamMember } from '../useEmployerTeam';

// --- Fixtures ------------------------------------------------------------

const COMPANY_ID = 'company-abc';

const seedMembers: TeamMember[] = [
  {
    user_id: 'employer-1',
    display_name: 'Elena Employer',
    avatar_url: null,
    joined_at: '2026-01-01T00:00:00Z',
  },
  {
    user_id: 'teammate-1',
    display_name: 'Tara Teammate',
    avatar_url: 'https://x.test/t.png',
    joined_at: '2026-01-05T00:00:00Z',
  },
];

// --- Tests ---------------------------------------------------------------

describe('useEmployerTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: get_team_members returns the seed roster
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'get_team_members') {
        return { data: seedMembers, error: null };
      }
      return { data: null, error: null };
    });
  });

  describe('mount fetch', () => {
    it('does not fetch when companyId is null', async () => {
      const { result } = renderHook(() => useEmployerTeam(null));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockRpc).not.toHaveBeenCalled();
      expect(result.current.members).toEqual([]);
    });

    it('fetches team members on mount when companyId is set', async () => {
      const { result } = renderHook(() => useEmployerTeam(COMPANY_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockRpc).toHaveBeenCalledWith('get_team_members', {
        p_company_id: COMPANY_ID,
      });
      expect(result.current.members).toHaveLength(2);
      expect(result.current.members[0].display_name).toBe('Elena Employer');
    });

    it('sets error state when fetch fails', async () => {
      mockRpc.mockImplementation(async () => ({
        data: null,
        error: { message: 'Not linked to company' },
      }));
      const { result } = renderHook(() => useEmployerTeam(COMPANY_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Not linked to company');
      expect(result.current.members).toEqual([]);
    });
  });

  describe('addMember — optimistic', () => {
    it('appends optimistically and calls add_team_member RPC', async () => {
      const { result } = renderHook(() => useEmployerTeam(COMPANY_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      mockRpc.mockClear();

      // add_team_member succeeds
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await act(async () => {
        await result.current.addMember('new-user', {
          display_name: 'Nadia New',
          avatar_url: null,
        });
      });

      expect(mockRpc).toHaveBeenCalledWith('add_team_member', {
        p_company_id: COMPANY_ID,
        p_user_id: 'new-user',
      });
      expect(result.current.members).toHaveLength(3);
      expect(
        result.current.members.find((m) => m.user_id === 'new-user')
          ?.display_name
      ).toBe('Nadia New');
    });

    it('rolls back and rethrows when add RPC fails', async () => {
      const { result } = renderHook(() => useEmployerTeam(COMPANY_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      mockRpc.mockClear();

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'User is not in your connections' },
      });

      await expect(
        act(async () => {
          await result.current.addMember('stranger', {
            display_name: 'Stranger',
            avatar_url: null,
          });
        })
      ).rejects.toThrow('User is not in your connections');

      // Roster restored to original 2 members
      expect(result.current.members).toHaveLength(2);
      expect(
        result.current.members.find((m) => m.user_id === 'stranger')
      ).toBeUndefined();
    });
  });

  describe('removeMember — optimistic', () => {
    it('filters optimistically and calls remove_team_member RPC', async () => {
      const { result } = renderHook(() => useEmployerTeam(COMPANY_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      mockRpc.mockClear();

      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await act(async () => {
        await result.current.removeMember('teammate-1');
      });

      expect(mockRpc).toHaveBeenCalledWith('remove_team_member', {
        p_company_id: COMPANY_ID,
        p_user_id: 'teammate-1',
      });
      expect(result.current.members).toHaveLength(1);
      expect(
        result.current.members.find((m) => m.user_id === 'teammate-1')
      ).toBeUndefined();
    });

    it('rolls back and rethrows when remove RPC fails', async () => {
      const { result } = renderHook(() => useEmployerTeam(COMPANY_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      mockRpc.mockClear();

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Cannot remove yourself' },
      });

      await expect(
        act(async () => {
          await result.current.removeMember('employer-1');
        })
      ).rejects.toThrow('Cannot remove yourself');

      expect(result.current.members).toHaveLength(2);
    });
  });

  describe('interface', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useEmployerTeam(null));
      expect(result.current).toHaveProperty('members');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('addMember');
      expect(result.current).toHaveProperty('removeMember');
      expect(result.current).toHaveProperty('refetch');
    });
  });
});
