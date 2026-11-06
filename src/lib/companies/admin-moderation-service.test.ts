import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminModerationService } from './admin-moderation-service';
import { geocode } from './geocoding';

vi.mock('./geocoding', () => ({ geocode: vi.fn() }));

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

/**
 * Records every insert/delete per table so the tests can see which rows an
 * approval wrote. `failLocationInsert` makes the company_locations insert fail.
 */
function approvalSupabase(
  privateCompany: Record<string, unknown> | Record<string, unknown>[],
  opts: { failLocationInsert?: boolean } = {}
) {
  const inserts: { table: string; row: any }[] = [];
  const deletes: { table: string; id: unknown }[] = [];
  const from = vi.fn((table: string) => {
    const chain: any = {};
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((_col: string, val: unknown) => {
      if (op === 'delete') deletes.push({ table, id: val });
      return chain;
    });
    chain.insert = vi.fn((row: any) => {
      op = 'insert';
      inserts.push({ table, row });
      return chain;
    });
    chain.update = vi.fn(() => {
      op = 'update';
      return chain;
    });
    chain.delete = vi.fn(() => {
      op = 'delete';
      return chain;
    });
    chain.single = vi.fn(async () => {
      if (table === 'company_contributions' && op === 'select') {
        return {
          data: {
            id: 'contrib-1',
            private_company_id: 'pc-1',
            private_companies: privateCompany,
          },
          error: null,
        };
      }
      if (table === 'shared_companies') {
        return { data: { id: 'shared-1' }, error: null };
      }
      return { data: { id: 'contrib-1', status: 'approved' }, error: null };
    });
    // company_locations insert and shared_companies delete are awaited
    // directly (no .single()), so the chain itself is thenable.
    chain.then = (resolve: (v: unknown) => void) =>
      resolve(
        table === 'company_locations' && opts.failLocationInsert
          ? { data: null, error: { message: 'location insert failed' } }
          : { data: null, error: null }
      );
    return chain;
  });
  return { supabase: { from } as any, inserts, deletes };
}

describe('AdminModerationService.approveContribution (#71)', () => {
  beforeEach(() => {
    vi.mocked(geocode).mockReset();
  });

  const located = {
    metro_area_id: 'metro-1',
    name: 'Acme Welding',
    website: 'https://acme.test',
    careers_url: null,
    address: '1 High St',
    latitude: 51.5,
    longitude: -0.1,
    phone: '555-0100',
    email: 'hi@acme.test',
    contact_name: 'Pat',
    contact_title: 'Owner',
  };

  it('writes a headquarters location copied from the private company', async () => {
    const { supabase, inserts } = approvalSupabase(located);
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    await service.approveContribution('contrib-1');

    const loc = inserts.find((i) => i.table === 'company_locations');
    expect(loc?.row).toMatchObject({
      shared_company_id: 'shared-1',
      address: '1 High St',
      latitude: 51.5,
      longitude: -0.1,
      phone: '555-0100',
      email: 'hi@acme.test',
      contact_name: 'Pat',
      contact_title: 'Owner',
      is_headquarters: true,
    });
    expect(geocode).not.toHaveBeenCalled();
  });

  it('reads the location from an array-wrapped join', async () => {
    const { supabase, inserts } = approvalSupabase([located]);
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    await service.approveContribution('contrib-1');

    expect(
      inserts.find((i) => i.table === 'company_locations')?.row.latitude
    ).toBe(51.5);
  });

  it('geocodes the address when the coordinates are missing', async () => {
    vi.mocked(geocode).mockResolvedValue({
      success: true,
      address: '1 High St',
      latitude: 40.1,
      longitude: -75.2,
    });
    const { supabase, inserts } = approvalSupabase({
      ...located,
      latitude: null,
      longitude: null,
    });
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    await service.approveContribution('contrib-1');

    expect(geocode).toHaveBeenCalledWith('1 High St');
    expect(
      inserts.find((i) => i.table === 'company_locations')?.row
    ).toMatchObject({
      latitude: 40.1,
      longitude: -75.2,
    });
  });

  it('refuses to approve, and writes nothing, when the address cannot be placed', async () => {
    vi.mocked(geocode).mockResolvedValue({
      success: false,
      address: '1 High St',
      error: 'No results found for this address',
    });
    const { supabase, inserts } = approvalSupabase({
      ...located,
      latitude: null,
      longitude: null,
    });
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    await expect(service.approveContribution('contrib-1')).rejects.toThrow(
      /location/i
    );
    expect(inserts).toHaveLength(0);
  });

  it('refuses to approve a company with no address and no coordinates', async () => {
    const { supabase, inserts } = approvalSupabase({
      ...located,
      address: null,
      latitude: null,
      longitude: null,
    });
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    await expect(service.approveContribution('contrib-1')).rejects.toThrow(
      /location/i
    );
    expect(inserts).toHaveLength(0);
    expect(geocode).not.toHaveBeenCalled();
  });

  it('removes the new shared company if its location cannot be written', async () => {
    const { supabase, deletes } = approvalSupabase(located, {
      failLocationInsert: true,
    });
    const service = new AdminModerationService(supabase);
    await service.initialize('admin-1');

    await expect(service.approveContribution('contrib-1')).rejects.toThrow(
      /location insert failed/
    );
    expect(deletes).toContainEqual({
      table: 'shared_companies',
      id: 'shared-1',
    });
  });
});
