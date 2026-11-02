export type UserRole = 'ROOT_ADMIN' | 'ADMIN' | 'USER';
export type WorkspaceItemType = 'IDEA' | 'NOTE';
export type IdeaStatus = 'RAW' | 'PROTOTYPING' | 'PROMOTED' | 'SHELVED';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: UserRole;
  is_immutable: boolean;
  is_suspended: boolean;
  settings_json?: Record<string, any>;
  created_at: string;
}

export interface SkillCatalog {
  id: string;
  slug: string;
  name: string;
  category: string;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  total_xp: number;
  level: number;
  last_practiced_at?: string | null;
  created_at: string;
  skill?: SkillCatalog;
}

export interface PracticeLog {
  id: string;
  user_id: string;
  skill_id: string;
  duration_minutes: number;
  xp_gained: number;
  note: string;
  created_at: string;
  skill?: SkillCatalog;
}

export interface WorkspaceItem {
  id: string;
  user_id: string;
  item_type: WorkspaceItemType;
  title: string;
  content_md: string;
  tags: string[];
  idea_status: IdeaStatus;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  pm_user_id: string;
  status: ProjectStatus;
  completion_xp_reward: number;
  xp_awarded: boolean;
  created_at: string;
  pm?: Profile;
  members?: Profile[];
  skills?: SkillCatalog[];
  tasks?: ProjectTask[];
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface ProjectSkill {
  project_id: string;
  skill_id: string;
  skill?: SkillCatalog;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  assignee_id?: string | null;
  skill_id?: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  xp_reward: number;
  xp_awarded: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  skill?: SkillCatalog | null;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  project_id?: string | null;
  event_type: string;
  summary: string;
  xp_delta: number;
  metadata?: Record<string, any>;
  created_at: string;
  profile?: Profile;
}
