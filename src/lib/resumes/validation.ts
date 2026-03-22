import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_SIZE,
  type ValidationResult,
} from './types';

export function validateResumeFile(file: File): ValidationResult {
  if (!ALLOWED_RESUME_MIME_TYPES.includes(file.type as typeof ALLOWED_RESUME_MIME_TYPES[number])) {
    return {
      valid: false,
      error: 'Invalid file type. Accepted: PDF, DOCX, RTF, JPEG, PNG.',
    };
  }

  if (file.size > MAX_RESUME_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds the 10MB limit.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  return { valid: true };
}
