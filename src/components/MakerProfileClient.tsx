'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, SkillCatalog } from '@/lib/types';
import { relativeTime, getLevelProgress, cn } from '@/lib/utils';
import SkillSelector from '@/components/SkillSelector';
import UserAvatar from '@/components/UserAvatar';
import AvatarUploader from '@/components/AvatarUploader';
import {
  Sparkles,
  Flame,
  Award,
  Globe,
  Lock,
  Share2,
  Edit3,
  Check,
  X,
  ExternalLink,
  MessageSquare,
  Heart,
  Trash2,
  Send,
  Loader2,
  FolderKanban,
  Target,
  Image as ImageIcon,
  Coffee,
  CornerDownRight,
} from 'lucide-react';

interface MakerProfileClientProps {
  targetProfile: Profile;
  isOwnProfile: boolean;
  initialPosts: any[];
  initialProjects: any[];
  userSkills: any[];
  allSkills: SkillCatalog[];
  currentUserId: string;
  currentUserProfile: Profile | null;
}

export default function MakerProfileClient({
  targetProfile,
  isOwnProfile,
  initialPosts,
  initialProjects,
  userSkills,
  allSkills,
  currentUserId,
  currentUserProfile,
}: MakerProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'posts' | 'projects' | 'skills'>('posts');
  const [profile, setProfile] = useState<Profile>(targetProfile);
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [projects, setProjects] = useState<any[]>(initialProjects);

  // Bio Editing State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(targetProfile.bio || '');
  const [savingBio, setSavingBio] = useState(false);

  // Profile Post Composer State (If own profile)
  const [composerOpen, setComposerOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Lightbox
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Expanded Comments State
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, { commentId: string; authorName: string } | null>>({});

  // Compute total XP across all skills
  const totalXp = userSkills.reduce((sum, s) => sum + (s.total_xp || 0), 0);
  const levelInfo = getLevelProgress(totalXp);

  const isAdmin = currentUserProfile?.role === 'ROOT_ADMIN' || currentUserProfile?.role === 'ADMIN';

  // Save Bio
  async function handleSaveBio() {
    setSavingBio(true);
    try {
      const cleanBio = bioText.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ bio: cleanBio })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, bio: cleanBio }));
      setIsEditingBio(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update bio');
    } finally {
      setSavingBio(false);
    }
  }

  // Toggle Project Visibility (If own profile)
  async function handleToggleProjectVisibility(projectId: string, currentPublic: boolean) {
    const targetState = !currentPublic;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, is_public: targetState } : p))
    );

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_public: targetState })
        .eq('id', projectId)
        .eq('pm_user_id', currentUserId);

      if (error) throw error;
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update project showcase visibility');
      // Revert on error
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, is_public: currentPublic } : p))
      );
    }
  }

  // Handle Post Creation on Profile
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (!postContent.trim()) return;

    setIsPublishing(true);
    try {
      const { data: newPost, error } = await supabase
        .from('community_posts')
        .insert({
          author_id: currentUserId,
          content_md: postContent.trim(),
          skill_id: selectedSkillId || null,
          project_id: selectedProjectId || null,
        })
        .select(`
          *,
          author:profiles!community_posts_author_id_fkey(*),
          skill:skill_catalog(*),
          project:projects(id, name, status, is_public),
          likes:post_likes(user_id)
        `)
        .single();

      if (error) throw error;

      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      }
      setPostContent('');
      setSelectedSkillId('');
      setSelectedProjectId('');
      setComposerOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to share post');
    } finally {
      setIsPublishing(false);
    }
  }

  // Toggle Like on Post
  async function handleToggleLike(postId: string) {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const isCurrentlyLiked = post.likes?.some((l: any) => l.user_id === currentUserId);
    const newLiked = !isCurrentlyLiked;
    const newCount = newLiked ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newLikes = newLiked
          ? [...(p.likes || []), { user_id: currentUserId }]
          : (p.likes || []).filter((l: any) => l.user_id !== currentUserId);

        return { ...p, likes_count: newCount, likes: newLikes };
      })
    );

    try {
      await supabase.rpc('toggle_post_like', { p_post_id: postId });
    } catch (err) {
      console.error(err);
    }
  }

  // Delete Post
  async function handleDeletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
    }
  }

  // Expand Comments
  async function handleToggleComments(postId: string) {
    const isOpening = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: isOpening }));

    if (isOpening && !postCommentsMap[postId]) {
      const { data: comments } = await supabase
        .from('post_comments')
        .select('*, author:profiles!post_comments_user_id_fkey(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      const commentIds = (comments || []).map((c) => c.id);
      let userLikedCommentIds = new Set<string>();
      if (commentIds.length > 0 && currentUserId) {
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .in('comment_id', commentIds)
          .eq('user_id', currentUserId);
        if (likes) {
          userLikedCommentIds = new Set(likes.map((l) => l.comment_id));
        }
      }

      const enrichedComments = (comments || []).map((c) => ({
        ...c,
        is_liked: userLikedCommentIds.has(c.id),
      }));

      setPostCommentsMap((prev) => ({ ...prev, [postId]: enrichedComments }));
    }
  }

  // Toggle Comment Like
  async function handleToggleCommentLike(postId: string, commentId: string) {
    if (!currentUserId) {
      router.push('/login');
      return;
    }

    // Optimistic toggle
    setPostCommentsMap((prev) => {
      const list = prev[postId] || [];
      return {
        ...prev,
        [postId]: list.map((c) => {
          if (c.id === commentId) {
            const currentlyLiked = Boolean(c.is_liked);
            return {
              ...c,
              is_liked: !currentlyLiked,
              likes_count: Math.max(0, (c.likes_count || 0) + (currentlyLiked ? -1 : 1)),
            };
          }
          return c;
        }),
      };
    });

    try {
      const { data, error } = await supabase.rpc('toggle_comment_like', {
        p_comment_id: commentId,
      });
      if (error) throw error;
      if (data) {
        setPostCommentsMap((prev) => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.map((c) =>
              c.id === commentId
                ? { ...c, is_liked: data.liked, likes_count: data.likes_count }
                : c
            ),
          };
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle comment like:', err);
    }
  }

  // Add Comment or Reply
  async function handleAddComment(postId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const parent = replyingTo[postId] || null;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: text,
          parent_comment_id: parent?.commentId || null,
        })
        .select('*, author:profiles!post_comments_user_id_fkey(*)')
        .single();

      if (error) throw error;

      setPostCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), { ...newComment, is_liked: false, likes_count: 0 }],
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setReplyingTo((prev) => ({ ...prev, [postId]: null }));
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  // Copy Profile Link
  function handleCopyShareLink() {
    const shareUrl = `${window.location.origin}/makers/${profile.username}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Public profile link copied to clipboard!');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* ==================================================================== */}
      {/* MAKER HERO CARD                                                      */}
      {/* ==================================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Ambient Top Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15" />

        <div className="relative pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {isOwnProfile ? (
              <AvatarUploader
                userId={profile.id}
                username={profile.username}
                currentAvatarUrl={profile.avatar_url || null}
                onAvatarUpdated={(newUrl) => {
                  setProfile((prev) => ({ ...prev, avatar_url: newUrl }));
                  router.refresh();
                }}
                size="2xl"
                shape="rounded-3xl"
                showControls={false}
              />
            ) : (
              <UserAvatar
                src={profile.avatar_url}
                name={profile.display_name || profile.username}
                size="2xl"
                shape="rounded-3xl"
                className="shadow-lg shadow-blue-500/20 border-4 border-white dark:border-slate-900 shrink-0"
              />
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {profile.display_name}
                </h1>
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                  @{profile.username}
                </span>

                {profile.role === 'ROOT_ADMIN' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                    ROOT ADMIN
                  </span>
                ) : profile.role === 'ADMIN' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white shadow-sm">
                    ADMIN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    MAKER
                  </span>
                )}
              </div>

              {/* Bio Section */}
              <div className="mt-2 max-w-xl">
                {isEditingBio ? (
                  <div className="space-y-2">
                    <textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder="Share a short bio about what you craft, your workshop equipment, and creative goals..."
                      rows={2}
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 transition"
                      >
                        {savingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setBioText(profile.bio || '');
                          setIsEditingBio(false);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                      {profile.bio || (isOwnProfile ? 'Click edit to add your workshop bio...' : 'This maker is busy in the workshop.')}
                    </p>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditingBio(true)}
                        className="text-slate-400 hover:text-blue-500 transition shrink-0 p-0.5"
                        title="Edit bio"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Badges: Level, XP, Streaks */}
              <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <span>Level {levelInfo.currentLevel}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{totalXp} Total XP</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{profile.current_streak || 0} Day Streak</span>
                </div>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
            {profile.support_url && (
              <a
                href={profile.support_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 shadow-sm transition transform hover:-translate-y-0.5"
                title={`Buy @${profile.username} a Coffee`}
              >
                <Coffee className="w-3.5 h-3.5 fill-current" />
                <span>Buy @{profile.username} a Coffee</span>
              </a>
            )}

            <button
              onClick={handleCopyShareLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Copy public profile link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {isOwnProfile ? (
              <Link
                href="/settings"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Settings
              </Link>
            ) : (
              <Link
                href="/community"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Back to Feed
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TABS NAVIGATION                                                      */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('posts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition',
            activeTab === 'posts'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition',
            activeTab === 'projects'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Public Projects ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition',
            activeTab === 'skills'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Target className="w-4 h-4" />
          <span>Skills & Mastery ({userSkills.length})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: POSTS                                                         */}
      {/* ==================================================================== */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Compact Composer if own profile */}
          {isOwnProfile && (
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              {!composerOpen ? (
                <button
                  onClick={() => setComposerOpen(true)}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 text-xs hover:border-blue-400 transition"
                >
                  Share an update to your maker profile and the community feed...
                </button>
              ) : (
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="What are you currently crafting or testing?"
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SkillSelector
                      mode="single"
                      skills={allSkills}
                      selectedId={selectedSkillId}
                      onChangeSingle={(id) => setSelectedSkillId(id || '')}
                      placeholder="Tag a skill..."
                    />

                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none"
                    >
                      <option value="">Link a project (optional)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setComposerOpen(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPublishing || !postContent.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition"
                    >
                      {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Publish</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                {isOwnProfile
                  ? "You haven't posted any updates yet. Share your latest workshop progress!"
                  : `@${profile.username} hasn't published any community posts yet.`}
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isLiked = post.likes?.some((l: any) => l.user_id === currentUserId);
              const canDelete = post.author_id === currentUserId || isAdmin;
              const commentsOpen = Boolean(expandedComments[post.id]);
              const postComments = postCommentsMap[post.id] || [];

              return (
                <article
                  key={post.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-400">
                        {relativeTime(post.created_at)}
                      </span>
                      {post.skill && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {post.skill.name}
                        </span>
                      )}
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                        title="Delete post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content_md}
                  </p>

                  {post.image_url && (
                    <div
                      className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-72 cursor-pointer"
                      onClick={() => setLightboxImageUrl(post.image_url)}
                    >
                      <img
                        src={post.image_url}
                        alt="Post media"
                        className="w-full max-h-72 object-cover"
                      />
                    </div>
                  )}

                  {post.project && (
                    <Link
                      href={`/projects/${post.project.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-blue-500 transition"
                    >
                      <span className="truncate">🪵 {post.project.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={cn(
                        'flex items-center gap-1.5 font-bold transition',
                        isLiked ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'
                      )}
                    >
                      <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="flex items-center gap-1.5 font-semibold text-slate-400 hover:text-blue-500 transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments_count || 0}</span>
                    </button>
                  </div>

                  {/* Inline Comments */}
                  {commentsOpen && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(() => {
                          const rootComments = postComments.filter((c) => !c.parent_comment_id);
                          const repliesByParent = postComments.reduce((acc: Record<string, any[]>, c) => {
                            if (c.parent_comment_id) {
                              acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
                              acc[c.parent_comment_id].push(c);
                            }
                            return acc;
                          }, {});

                          if (rootComments.length === 0) {
                            return (
                              <p className="text-xs text-slate-400 italic py-1">
                                No comments yet. Start the conversation!
                              </p>
                            );
                          }

                          return rootComments.map((c) => {
                            const replies = repliesByParent[c.id] || [];

                            return (
                              <div key={c.id} className="space-y-1.5">
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs space-y-1.5 border border-slate-200/50 dark:border-slate-800/50">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <UserAvatar
                                        src={c.author?.avatar_url}
                                        name={c.author?.display_name || c.author?.username}
                                        size="xs"
                                        shape="circle"
                                      />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-900 dark:text-white">
                                            {c.author?.display_name || 'Maker'}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {relativeTime(c.created_at)}
                                          </span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-0.5">
                                          {c.content}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Bar: Like & Reply */}
                                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200/40 dark:border-slate-800/40 pl-6">
                                    <button
                                      onClick={() => handleToggleCommentLike(post.id, c.id)}
                                      className={cn(
                                        'flex items-center gap-1 text-[10px] font-medium transition',
                                        c.is_liked
                                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                          : 'text-slate-400 hover:text-rose-600'
                                      )}
                                    >
                                      <Heart
                                        className={cn('w-3 h-3', c.is_liked && 'fill-rose-500 text-rose-500')}
                                      />
                                      <span>{c.likes_count || 0}</span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setReplyingTo((prev) => ({
                                          ...prev,
                                          [post.id]: {
                                            commentId: c.id,
                                            authorName:
                                              c.author?.display_name || c.author?.username || 'Maker',
                                          },
                                        }))
                                      }
                                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 font-medium transition"
                                    >
                                      <CornerDownRight className="w-3 h-3" />
                                      <span>Reply</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Nested Replies */}
                                {replies.length > 0 && (
                                  <div className="ml-5 pl-2.5 border-l-2 border-blue-500/20 space-y-1.5">
                                    {replies.map((reply) => (
                                      <div
                                        key={reply.id}
                                        className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 text-xs space-y-1 border border-slate-200/40 dark:border-slate-800/40"
                                      >
                                        <div className="flex items-start gap-2 min-w-0">
                                          <UserAvatar
                                            src={reply.author?.avatar_url}
                                            name={reply.author?.display_name || reply.author?.username}
                                            size="xs"
                                            shape="circle"
                                          />
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-slate-900 dark:text-white">
                                                {reply.author?.display_name || 'Maker'}
                                              </span>
                                              <span className="text-[10px] text-slate-400">
                                                {relativeTime(reply.created_at)}
                                              </span>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-0.5">
                                              {reply.content}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-0.5 pl-6">
                                          <button
                                            onClick={() => handleToggleCommentLike(post.id, reply.id)}
                                            className={cn(
                                              'flex items-center gap-1 text-[10px] font-medium transition',
                                              reply.is_liked
                                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                                : 'text-slate-400 hover:text-rose-600'
                                            )}
                                          >
                                            <Heart
                                              className={cn(
                                                'w-3 h-3',
                                                reply.is_liked && 'fill-rose-500 text-rose-500'
                                              )}
                                            />
                                            <span>{reply.likes_count || 0}</span>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Replying Banner */}
                      {replyingTo[post.id] && (
                        <div className="flex items-center justify-between px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                          <div className="flex items-center gap-1 text-[11px]">
                            <CornerDownRight className="w-3 h-3 text-blue-600" />
                            <span>Replying to <strong>@{replyingTo[post.id]?.authorName}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyingTo((prev) => ({ ...prev, [post.id]: null }))}
                            className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-500 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex items-center gap-2 pt-1"
                      >
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder={
                            replyingTo[post.id]
                              ? `Replying to @${replyingTo[post.id]?.authorName}...`
                              : 'Write a comment...'
                          }
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment[post.id] || !(commentInputs[post.id] || '').trim()}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition"
                        >
                          {submittingComment[post.id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : replyingTo[post.id] ? (
                            'Reply'
                          ) : (
                            'Send'
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PUBLIC PROJECTS                                               */}
      {/* ==================================================================== */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-full p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                {isOwnProfile
                  ? 'No public projects yet. Enable "Public Project Showcase" on your projects to show them here!'
                  : `@${profile.username} has no public projects published yet.`}
              </p>
            </div>
          ) : (
            projects.map((proj) => {
              const allTasks = proj.tasks || [];
              const doneTasks = allTasks.filter((t: any) => t.status === 'DONE').length;
              const progressPct =
                allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

              return (
                <div
                  key={proj.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {proj.name}
                      </h3>
                      {proj.is_public ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {proj.description || 'No description provided.'}
                    </p>

                    {/* Completion Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>
                          {doneTasks}/{allTasks.length} ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Linked Skills */}
                    {proj.skills && proj.skills.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {proj.skills.map((s: any) => (
                          <span
                            key={s.skill?.id}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {s.skill?.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Project Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Link
                      href={`/projects/${proj.id}`}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>View Showcase</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    {/* Quick toggle if own profile */}
                    {isOwnProfile && (
                      <button
                        onClick={() => handleToggleProjectVisibility(proj.id, proj.is_public)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {proj.is_public ? 'Make Private' : 'Make Public'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: SKILLS & MASTERY                                              */}
      {/* ==================================================================== */}
      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userSkills.length === 0 ? (
            <div className="col-span-full p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                {isOwnProfile
                  ? 'No skills unlocked yet. Practice skills or complete project tasks to earn XP!'
                  : `@${profile.username} hasn't leveled up any skills yet.`}
              </p>
            </div>
          ) : (
            userSkills.map((us) => {
              const skillLevel = us.level || 1;
              const skillXp = us.total_xp || 0;
              const nextLevelThreshold = skillLevel * 100;
              const currentLevelBase = (skillLevel - 1) * 100;
              const progressInLevel = Math.max(0, skillXp - currentLevelBase);
              const progressPct = Math.min(100, Math.round((progressInLevel / 100) * 100));

              return (
                <div
                  key={us.skill_id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {us.skill?.name || 'General Crafting'}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {us.skill?.category || 'General'}
                      </span>
                    </div>

                    <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Level {skillLevel}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      <span>{skillXp} Total XP</span>
                      <span>Next Level: {nextLevelThreshold} XP</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {us.last_practiced_at && (
                    <span className="text-[10px] text-slate-400 block">
                      Last practiced: {relativeTime(us.last_practiced_at)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImageUrl}
              alt="Expanded preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black text-white transition shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
