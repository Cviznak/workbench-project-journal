export type UserRole = 'ROOT_ADMIN' | 'ADMIN' | 'USER';
export type WorkspaceItemType = 'IDEA' | 'NOTE';
export type IdeaStatus = 'RAW' | 'PROTOTYPING' | 'PROMOTED' | 'SHELVED';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ItemType = 'MATERIAL' | 'EQUIPMENT' | 'FINISHED_GOOD';
export type ItemCondition = 'GOOD' | 'NEEDS_MAINTENANCE' | 'REPLACE';
export type Currency = 'USD' | 'EUR' | 'ILS' | 'GBP';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  support_url?: string | null;
  role: UserRole;
  is_immutable: boolean;
  is_suspended: boolean;
  current_streak?: number;
  longest_streak?: number;
  last_active_date?: string | null;
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

export type SkillRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SkillRequest {
  id: string;
  user_id: string;
  name: string;
  category: string;
  reason?: string | null;
  status: SkillRequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  user?: Profile;
  reviewer?: Profile;
}

export interface WorkspaceChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface WorkspaceMetadata {
  color_swatches?: string[];
  checklist?: WorkspaceChecklistItem[];
  reference_links?: Array<{ title: string; url: string }>;
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
  metadata_json?: WorkspaceMetadata;
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
  is_public?: boolean;
  created_at: string;
  pm?: Profile;
  members?: Profile[];
  skills?: SkillCatalog[];
  tasks?: ProjectTask[];
}

export type ProjectInvitationStatus = 'PENDING' | 'ACCEPTED';

export interface ProjectMember {
  project_id: string;
  user_id: string;
  invitation_status: ProjectInvitationStatus;
  joined_at: string;
  profile?: Profile;
  project?: Project;
}

export interface ProjectSkill {
  project_id: string;
  skill_id: string;
  skill?: SkillCatalog;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
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
  subtasks?: TaskSubtask[];
  comments_count?: number;
  attachments_count?: number;
  prerequisite_task_id?: string | null;
  prerequisite_task?: { id: string; title: string; status: TaskStatus } | null;
  task_materials?: TaskMaterial[];
  material_cost?: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  skill?: SkillCatalog | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  content_md: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  parent_comment_id?: string | null;
  author?: Profile;
  replies?: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  project_id: string;
  uploader_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploader?: Profile;
  signedUrl?: string;
}

export interface InventoryFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  folder_id?: string | null;
  item_type: ItemType;
  name: string;
  description: string;
  sku_or_location: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  unit_price: number;
  currency: Currency;
  condition: ItemCondition;
  search_keyword: string;
  reorder_url: string;
  in_restock_cart: boolean;
  restock_target_qty: number;
  image_url?: string | null;
  updated_at: string;
  created_at: string;
  folder?: InventoryFolder | null;
}

export interface TaskMaterial {
  id: string;
  task_id: string;
  project_id: string;
  inventory_item_id: string;
  quantity_required: number;
  deducted: boolean;
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity_required: number;
  inventory_item?: InventoryItem;
}

export interface RecipeRun {
  id: string;
  recipe_id: string;
  user_id: string;
  batch_multiplier: number;
  units_produced: number;
  total_batch_cost: number;
  unit_cogs: number;
  outcome_rating: number | null;
  batch_notes: string;
  created_at: string;
}

export interface MakerRecipe {
  id: string;
  user_id: string;
  title: string;
  category: string;
  instructions_md: string;
  rating?: number | null;
  output_item_id?: string | null;
  output_yield_qty?: number;
  packaging_overhead?: number;
  target_retail_price?: number;
  output_item?: InventoryItem | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
  runs?: RecipeRun[];
}

export interface MakerArchiveExport {
  version: string;
  exported_at: string;
  profile: Profile;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    skill_slug: string;
    category: string;
    total_xp: number;
    level: number;
    last_practiced_at?: string | null;
  }>;
  practice_logs: Array<{
    id: string;
    skill_name: string;
    duration_minutes: number;
    xp_gained: number;
    note: string;
    created_at: string;
  }>;
  workspace_items: WorkspaceItem[];
  projects: Project[];
  tasks: ProjectTask[];
  comments: TaskComment[];
  inventory_folders?: InventoryFolder[];
  inventory_items?: InventoryItem[];
  task_materials?: TaskMaterial[];
  maker_recipes?: MakerRecipe[];
  recipe_ingredients?: RecipeIngredient[];
  recipe_runs?: RecipeRun[];
  activity_logs: any[];
}

export interface ActivityHeatmapDay {
  activity_date: string;
  practice_minutes: number;
  tasks_completed: number;
  xp_earned: number;
  intensity: number; // 0..4
}

export type SkillTier = 'Novice' | 'Apprentice' | 'Artisan' | 'Master' | 'Grandmaster';

export function getSkillTier(level: number): {
  tier: SkillTier;
  color: string;
  badgeBg: string;
  borderColor: string;
  gradient: string;
} {
  if (level >= 50) {
    return {
      tier: 'Grandmaster',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      borderColor: 'border-amber-500/40',
      gradient: 'from-amber-500 to-yellow-600',
    };
  }
  if (level >= 31) {
    return {
      tier: 'Master',
      color: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      borderColor: 'border-purple-500/40',
      gradient: 'from-purple-500 to-indigo-600',
    };
  }
  if (level >= 16) {
    return {
      tier: 'Artisan',
      color: 'text-blue-400',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      borderColor: 'border-blue-500/40',
      gradient: 'from-blue-500 to-cyan-600',
    };
  }
  if (level >= 6) {
    return {
      tier: 'Apprentice',
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      borderColor: 'border-emerald-500/40',
      gradient: 'from-emerald-500 to-teal-600',
    };
  }
  return {
    tier: 'Novice',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    borderColor: 'border-slate-500/40',
    gradient: 'from-slate-500 to-slate-600',
  };
}

export function calculateStreak(dates: (string | Date)[]): number {
  if (!dates || dates.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(
      dates.map((d) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
          dt.getDate()
        ).padStart(2, '0')}`;
      })
    )
  ).sort().reverse();

  if (uniqueDays.length === 0) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
    yesterday.getDate()
  ).padStart(2, '0')}`;

  let currentStreak = 0;
  let checkDate = new Date();

  // If active today, start from today. If active yesterday, start from yesterday.
  if (uniqueDays[0] === todayStr) {
    checkDate = today;
  } else if (uniqueDays[0] === yesterdayStr) {
    checkDate = yesterday;
  } else {
    return 0; // streak broken
  }

  for (const day of uniqueDays) {
    const expected = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(
      checkDate.getDate()
    ).padStart(2, '0')}`;
    if (day === expected) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
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

export interface CommunityPost {
  id: string;
  author_id: string;
  title?: string;
  content_md: string;
  image_url?: string | null;
  skill_id?: string | null;
  project_id?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  skill?: SkillCatalog | null;
  project?: Project | null;
  user_has_liked?: boolean;
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  likes_count?: number;
  is_liked?: boolean;
  author?: Profile;
  replies?: PostComment[];
}

export interface CommentLike {
  comment_id: string;
  user_id: string;
  created_at: string;
}

export type NotificationType =
  | 'SKILL_REQUEST_ADMIN'
  | 'SKILL_REQUEST_REVIEWED'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'COMMENT_LIKED'
  | 'COMMENT_REPLIED'
  | 'TASK_ASSIGNED'
  | 'PROJECT_INVITE'
  | 'USER_FEEDBACK';

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id?: string | null;
  notification_type: NotificationType | string;
  title: string;
  body: string;
  link_url: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export type FeedbackCategory = 'BUG' | 'FEATURE_IDEA' | 'FEEDBACK';
export type FeedbackStatus = 'OPEN' | 'REVIEWED' | 'RESOLVED';

export interface UserFeedback {
  id: string;
  user_id?: string | null;
  category: FeedbackCategory;
  message: string;
  page_url?: string;
  status: FeedbackStatus;
  created_at: string;
  user?: Profile | null;
}

export interface MakerLeaderboardEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  skills_count: number;
  public_projects_count: number;
  created_at: string;
}



