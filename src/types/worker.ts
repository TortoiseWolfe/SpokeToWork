import type { ThemeColors } from '@/hooks/useThemeColors';

export interface Skill {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  /** DaisyUI token name. Null inherits from parent. */
  color: keyof ThemeColors | null;
  /** lucide-react icon name. Null inherits from parent. */
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResolvedSkill {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  /** Always non-null — falls back to 'primary' if no ancestor has color. */
  color: keyof ThemeColors;
  /** Always non-null — falls back to 'user' if no ancestor has icon. */
  icon: string;
  ancestry: string[];
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface DiscoverableWorker {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  /** Resolved client-side from the embedded user_skills rows (auto-primary logic). */
  primary_skill_id: string | null;
  user_skills: UserSkill[];
}

export interface WorkerFilters {
  skill_ids?: string[];
}
