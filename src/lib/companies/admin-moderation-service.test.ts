import { describe, it, expect, vi } from 'vitest';
import { AdminModerationService } from './admin-moderation-service';

function mockSupabase(contributions: unknown[], suggestions: unknown[] = []) {
  const from = vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: table === 'company_contributions' ? contributions : suggestions,
      error: null,
    }),
  }));
   
  return { from } as any;
}

describe('AdminModerationService.getPendingQueue', () => {
  it('surfaces private_company coordinates + contact fields on contribution items', async () => {
    const supabase = mockSupabase([
      {
        id: 'contrib-1',
        user_id: 'user-1',
        private_company_id: 'pc-1',
        status: 'pending',
        created_at: '2026-01-01T00:00:00Z',
        private_companies: {
          name: 'Acme Welding',
          latitude: 51.5,
          longitude: -0.1,
          address: '1 High St',
          phone: '555-0100',
          email: 'hi@acme.test',
          website: 'https://acme.test',
          notes: 'submitted via mobile',
        },
      },
    ]);
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    const queue = await service.getPendingQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: 'contribution',
      private_company_name: 'Acme Welding',
      latitude: 51.5,
      longitude: -0.1,
      address: '1 High St',
      phone: '555-0100',
      email: 'hi@acme.test',
      website: 'https://acme.test',
      notes: 'submitted via mobile',
    });
  });

  it('tolerates null coordinates (contribution with no geocode)', async () => {
    const supabase = mockSupabase([
      {
        id: 'contrib-2',
        user_id: 'user-1',
        private_company_id: 'pc-2',
        status: 'pending',
        created_at: '2026-01-01T00:00:00Z',
        private_companies: {
          name: 'No Coords Ltd',
          latitude: null,
          longitude: null,
          address: null,
          phone: null,
          email: null,
          website: null,
          notes: null,
        },
      },
    ]);
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    const queue = await service.getPendingQueue();

    expect(queue[0].latitude).toBeNull();
    expect(queue[0].longitude).toBeNull();
  });

  it('handles Supabase array-wrapped join shape', async () => {
    // Supabase sometimes returns joined rows as a single-element array
    // depending on relationship inference. The existing code already
    // handles this for `name` — make sure new fields do too.
    const supabase = mockSupabase([
      {
        id: 'contrib-3',
        user_id: 'user-1',
        private_company_id: 'pc-3',
        status: 'pending',
        created_at: '2026-01-01T00:00:00Z',
        private_companies: [
          {
            name: 'Array Co',
            latitude: 52,
            longitude: 0,
            address: null,
            phone: null,
            email: null,
            website: null,
            notes: null,
          },
        ],
      },
    ]);
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    const queue = await service.getPendingQueue();

    expect(queue[0].private_company_name).toBe('Array Co');
    expect(queue[0].latitude).toBe(52);
  });
});
