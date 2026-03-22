/**
 * Resume Service
 *
 * Handles CRUD operations for worker_resumes: listing, uploading,
 * deleting, setting the default, and renaming resumes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resume } from './types';
import { ALLOWED_RESUME_EXTENSIONS } from './types';
import { validateResumeFile } from './validation';

export class ResumeService {
  constructor(private supabase: SupabaseClient) {}

  /** Fetch all resumes for a worker, ordered oldest-first. */
  async getWorkerResumes(userId: string): Promise<Resume[]> {
    const { data, error } = await this.supabase
      .from('worker_resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Resume[];
  }

  /**
   * Validate, upload to storage, and insert a new resume row.
   * If this is the worker's first resume, automatically sets it as default.
   */
  async uploadResume(userId: string, file: File, label: string): Promise<Resume> {
    // 1. Validate
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Determine file extension
    const ext = ALLOWED_RESUME_EXTENSIONS[file.type] ?? '';

    // 3. Generate storage path
    const path = `resumes/${userId}/${crypto.randomUUID()}${ext}`;

    // 4. Check existing resumes BEFORE uploading (to decide on setDefault later)
    const existing = await this.getWorkerResumes(userId);
    const isFirst = existing.length === 0;

    // 5. Upload to storage
    const { error: uploadError } = await this.supabase.storage
      .from('resumes')
      .upload(path, file);

    if (uploadError) throw uploadError;

    // 6. Insert database row
    const { data, error: insertError } = await this.supabase
      .from('worker_resumes')
      .insert({
        user_id: userId,
        label,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const resume = data as Resume;

    // 7. Auto-set default if first resume
    if (isFirst) {
      await this.setDefault(resume.id);
    }

    return resume;
  }

  /**
   * Delete a resume: removes the storage object, deletes the row,
   * and promotes the next oldest resume to default if the deleted one was default.
   */
  async deleteResume(resumeId: string): Promise<void> {
    // 1. Fetch the resume row to get storage_path and is_default
    const { data: resumeData, error: fetchError } = await this.supabase
      .from('worker_resumes')
      .select('*')
      .eq('id', resumeId)
      .single();

    if (fetchError) throw fetchError;
    const resume = resumeData as Resume;

    // 2. Remove from storage
    const { error: storageError } = await this.supabase.storage
      .from('resumes')
      .remove([resume.storage_path]);

    if (storageError) throw storageError;

    // 3. Delete the database row
    const { error: deleteError } = await this.supabase
      .from('worker_resumes')
      .delete()
      .eq('id', resumeId);

    if (deleteError) throw deleteError;

    // 4. If this was the default resume, promote the next oldest
    if (resume.is_default) {
      const remaining = await this.getWorkerResumes(resume.user_id);
      if (remaining.length > 0) {
        await this.setDefault(remaining[0].id);
      }
    }
  }

  /** Set a resume as the default via RPC (handles clearing the old default). */
  async setDefault(resumeId: string): Promise<void> {
    const { error } = await this.supabase.rpc('set_default_resume', {
      p_resume_id: resumeId,
    });

    if (error) throw error;
  }

  /** Update the display label of a resume. */
  async renameResume(resumeId: string, label: string): Promise<void> {
    const { error } = await this.supabase
      .from('worker_resumes')
      .update({ label })
      .eq('id', resumeId);

    if (error) throw error;
  }
}
