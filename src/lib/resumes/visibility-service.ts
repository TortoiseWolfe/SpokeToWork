import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkerVisibility } from './types';

export class VisibilityService {
  constructor(private supabase: SupabaseClient) {}

  async getVisibility(userId: string): Promise<WorkerVisibility> {
    const { data, error } = await this.supabase
      .from('worker_visibility')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Create default row
      const { data: inserted, error: insertError } = await this.supabase
        .from('worker_visibility')
        .upsert({
          user_id: userId,
          profile_public: true,
          resume_visible_to: 'none',
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted;
    }

    return data;
  }

  async updateVisibility(
    userId: string,
    changes: Partial<Pick<WorkerVisibility, 'profile_public' | 'resume_visible_to'>>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('worker_visibility')
      .update(changes)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
