/**
 * Unit Tests for useTeamMembers
 * TDD: Tests written first, hook implementation second.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockMembers = [
  {
    id: 'member-1',
    company_id: 'company-abc',
    user_id: null,
    name: 'Alice',
    email: 'alice@example.com',
    role_title: 'Developer',
    start_date: null,
    added_by: 'user-123',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  },
  {
    id: 'member-2',
    company_id: 'company-abc',
    user_id: null,
    name: 'Bob',
    email: 'bob@example.com',
    role_title: 'Designer',
    start_date: null,
    added_by: 'user-123',
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-05-01T00:00:00Z',
  },
];

// Chainable query builder mock
const mockOrder = vi.fn();
const mockEq = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

// Insert chain
const mockInsertSelect = vi.fn();
const mockInsertSingle = vi.fn();
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

// Delete chain
const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));

// Channel mock
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
};

const mockRemoveChannel = vi.fn();
const mockChannelFn = vi.fn(() => mockChannel);

const mockFrom = vi.fn((table: string) => {
  if (table === 'team_members') {
    return {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    };
  }
  return { select: mockSelect };
});

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
  })),
}));

// Import after mocks
import { useTeamMembers } from '../useTeamMembers';

describe('useTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Default: successful fetch
    mockOrder.mockResolvedValue({ data: mockMembers, error: null });

    // Default: successful insert
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
    mockInsertSingle.mockResolvedValue({
      data: {
        id: 'member-new',
        company_id: 'company-abc',
        user_id: null,
        name: 'Charlie',
        email: 'charlie@example.com',
        role_title: null,
        start_date: null,
        added_by: 'user-123',
        created_at: '2024-07-01T00:00:00Z',
        updated_at: '2024-07-01T00:00:00Z',
      },
      error: null,
    });

    // Default: successful delete
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. fetches members for a company
  // -----------------------------------------------------------------------
  it('fetches members for a company', async () => {
    const { result } = renderHook(() => useTeamMembers('company-abc'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members).toEqual(mockMembers);
    expect(result.current.error).toBeNull();

    // Verify query chain
    expect(mockFrom).toHaveBeenCalledWith('team_members');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('company_id', 'company-abc');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  // -----------------------------------------------------------------------
  // 2. sets error on fetch failure
  // -----------------------------------------------------------------------
  it('sets error on fetch failure', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.members).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // 3. returns error when not authenticated
  // -----------------------------------------------------------------------
  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Not authenticated');
    expect(result.current.members).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // 4. addMember optimistically prepends to list
  // -----------------------------------------------------------------------
  it('addMember optimistically prepends to list', async () => {
    const { result } = renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMember({
        name: 'Charlie',
        email: 'charlie@example.com',
      });
    });

    // After the insert resolves, the real data replaces the placeholder
    expect(result.current.members[0].name).toBe('Charlie');
    expect(result.current.members[0].email).toBe('charlie@example.com');
    expect(result.current.members.length).toBe(3);
  });

  // -----------------------------------------------------------------------
  // 5. removeMember optimistically removes from list
  // -----------------------------------------------------------------------
  it('removeMember optimistically removes from list', async () => {
    const { result } = renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.members.length).toBe(2);

    await act(async () => {
      await result.current.removeMember('member-1');
    });

    expect(result.current.members.length).toBe(1);
    expect(
      result.current.members.find((m) => m.id === 'member-1')
    ).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 6. reverts optimistic add on error
  // -----------------------------------------------------------------------
  it('reverts optimistic add on error', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });

    const { result } = renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMember({
        name: 'Charlie',
        email: 'charlie@example.com',
      });
    });

    // Reverted: original 2 members
    expect(result.current.members.length).toBe(2);
    expect(result.current.members.map((m) => m.id)).toEqual([
      'member-1',
      'member-2',
    ]);
  });

  // -----------------------------------------------------------------------
  // 7. reverts optimistic remove on error
  // -----------------------------------------------------------------------
  it('reverts optimistic remove on error', async () => {
    mockDeleteEq.mockResolvedValue({
      error: { message: 'Delete failed' },
    });

    const { result } = renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.removeMember('member-1');
    });

    // Reverted: all 2 members still present
    expect(result.current.members.length).toBe(2);
    expect(
      result.current.members.find((m) => m.id === 'member-1')
    ).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 8. subscribes to realtime channel
  // -----------------------------------------------------------------------
  it('subscribes to realtime channel', async () => {
    renderHook(() => useTeamMembers('company-abc'));

    await waitFor(() => {
      expect(mockChannelFn).toHaveBeenCalledWith('team-members-company-abc');
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'team_members',
        filter: 'company_id=eq.company-abc',
      }),
      expect.any(Function)
    );

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'DELETE',
        schema: 'public',
        table: 'team_members',
        filter: 'company_id=eq.company-abc',
      }),
      expect.any(Function)
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });
});
