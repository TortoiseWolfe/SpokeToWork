export interface Resume {
  id: string;
  user_id: string;
  label: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerVisibility {
  user_id: string;
  profile_public: boolean;
  resume_visible_to: 'none' | 'applied' | 'all_employers';
  created_at: string;
  updated_at: string;
}

export type ResumeVisibility = WorkerVisibility['resume_visible_to'];

export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'image/jpeg',
  'image/png',
] as const;

export const ALLOWED_RESUME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/rtf': '.rtf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_RESUMES_PER_WORKER = 5;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
