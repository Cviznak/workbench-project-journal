'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, SkillCatalog } from '@/lib/types';
import { relativeTime, cn } from '@/lib/utils';
import SkillSelector from '@/components/SkillSelector';
import {
  Heart,
  MessageSquare,
  Share2,
  Trash2,
  Image as ImageIcon,
  X,
  Send,
  Loader2,
  Sparkles,
  Globe,
  Lock,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CommunityFeedClientProps {
  initialPosts: any[];
  allSkills: SkillCatalog[];
  userProjects: Array<{ id: string; name: string; is_public: boolean; status: string }>;
  currentUserId: string;
  currentProfile: Profile | null;
}

export default function CommunityFeedClient({
  initialPosts,
  allSkills,
  userProjects,
  currentUserId,
  currentProfile,
}: CommunityFeedClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Feed State
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [filterSkillId, setFilterSkillId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

  // Composer State
  const [postContent, setPostContent] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [autoMakeProjectPublic, setAutoMakeProjectPublic] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Lightbox
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Expanded Comments (keyed by post_id)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  const isAdmin = currentProfile?.role === 'ROOT_ADMIN' || currentProfile?.role === 'ADMIN';

  // Keep posts in sync with initialPosts
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  // Realtime subscription for community posts
  useEffect(() => {
    const channel = supabase
      .channel('community-feed-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('community_posts')
              .select(`
                *,
                author:profiles!community_posts_author_id_fkey(*),
                skill:skill_catalog(*),
                project:projects(id, name, status, is_public),
                likes:post_likes(user_id)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setPosts((prev) => {
                if (prev.some((p) => p.id === data.id)) return prev;
                return [data, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === payload.new.id
                  ? {
                      ...p,
                      likes_count: payload.new.likes_count,
                      comments_count: payload.new.comments_count,
                      content_md: payload.new.content_md,
                      image_url: payload.new.image_url,
                      updated_at: payload.new.updated_at,
                    }
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // When selectedProjectId changes, check if project is currently private
  useEffect(() => {
    if (!selectedProjectId) {
      setAutoMakeProjectPublic(false);
      return;
    }
    const proj = userProjects.find((p) => p.id === selectedProjectId);
    if (proj && !proj.is_public) {
      setAutoMakeProjectPublic(true);
    } else {
      setAutoMakeProjectPublic(false);
    }
  }, [selectedProjectId, userProjects]);

  // Handle image file selection
  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Max 5MB check
    if (file.size > 5242880) {
      setComposerError('Image exceeds 5MB size limit.');
      return;
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setComposerError(null);
  }

  function handleRemoveImage() {
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Submit Post
  async function handlePublishPost(e: React.FormEvent) {
    e.preventDefault();
    const cleanContent = postContent.trim();
    if (!cleanContent) {
      setComposerError('Please write something to share with the community.');
      return;
    }

    setIsPublishing(true);
    setComposerError(null);

    try {
      let uploadedImageUrl: string | null = null;

      // 1. Upload image to community-media bucket if selected
      if (imageFile) {
        const cleanName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${currentUserId}/${Date.now()}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('community-media')
          .upload(storagePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabase.storage
          .from('community-media')
          .getPublicUrl(storagePath);

        uploadedImageUrl = publicUrlData?.publicUrl || null;
      }

      // 2. If user linked a private project and opted in to make it public
      if (selectedProjectId && autoMakeProjectPublic) {
        await supabase
          .from('projects')
          .update({ is_public: true })
          .eq('id', selectedProjectId)
          .eq('pm_user_id', currentUserId);
      }

      // 3. Insert community post
      const { data: newPost, error: insertErr } = await supabase
        .from('community_posts')
        .insert({
          author_id: currentUserId,
          content_md: cleanContent,
          image_url: uploadedImageUrl,
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

      if (insertErr) throw insertErr;

      // Reset composer
      setPostContent('');
      setSelectedSkillId('');
      setSelectedProjectId('');
      setAutoMakeProjectPublic(false);
      handleRemoveImage();

      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      }
      router.refresh();
    } catch (err: any) {
      setComposerError(err.message || 'Failed to share post.');
    } finally {
      setIsPublishing(false);
    }
  }

  // Toggle Like on Post
  async function handleToggleLike(postId: string) {
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const isCurrentlyLiked = post.likes?.some((l: any) => l.user_id === currentUserId);
    const newLiked = !isCurrentlyLiked;
    const newCount = newLiked ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1);

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newLikes = newLiked
          ? [...(p.likes || []), { user_id: currentUserId }]
          : (p.likes || []).filter((l: any) => l.user_id !== currentUserId);

        return {
          ...p,
          likes_count: newCount,
          likes: newLikes,
        };
      })
    );

    try {
      const { data, error } = await supabase.rpc('toggle_post_like', {
        p_post_id: postId,
      });

      if (error) throw error;

      if (data) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes_count: data.likes_count,
                  likes: data.liked
                    ? [...(p.likes || []).filter((l: any) => l.user_id !== currentUserId), { user_id: currentUserId }]
                    : (p.likes || []).filter((l: any) => l.user_id !== currentUserId),
                }
              : p
          )
        );
      }
    } catch (err: any) {
      console.error('Like toggle failed:', err);
      // Revert on error
      router.refresh();
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

  // Toggle Comments Accordion & Load Comments
  async function handleToggleComments(postId: string) {
    const isOpening = !expandedComments[postId];

    setExpandedComments((prev) => ({
      ...prev,
      [postId]: isOpening,
    }));

    if (isOpening && !postCommentsMap[postId]) {
      const { data: comments } = await supabase
        .from('post_comments')
        .select('*, author:profiles!post_comments_user_id_fkey(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      setPostCommentsMap((prev) => ({
        ...prev,
        [postId]: comments || [],
      }));
    }
  }

  // Submit Comment
  async function handleAddComment(postId: string, e: React.FormEvent) {
    e.preventDefault();
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: text,
        })
        .select('*, author:profiles!post_comments_user_id_fkey(*)')
        .single();

      if (error) throw error;

      // Update comments list and post comments_count
      setPostCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
        )
      );

      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  // Delete Comment
  async function handleDeleteComment(postId: string, commentId: string) {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw error;

      setPostCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    }
  }

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'mine' && post.author_id !== currentUserId) {
      return false;
    }
    if (filterSkillId && post.skill_id !== filterSkillId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const authorMatch =
        post.author?.username?.toLowerCase().includes(q) ||
        post.author?.display_name?.toLowerCase().includes(q);
      const contentMatch = post.content_md?.toLowerCase().includes(q);
      const skillMatch = post.skill?.name?.toLowerCase().includes(q);
      const projectMatch = post.project?.name?.toLowerCase().includes(q);

      if (!authorMatch && !contentMatch && !skillMatch && !projectMatch) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Maker Community
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share updates, show off creations, exchange craft tips, and explore live blueprints.
              </p>
            </div>
          </div>
        </div>

        {currentProfile?.username && (
          <Link
            href={`/makers/${currentProfile.username}`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition shrink-0"
          >
            <span>My Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>
        )}
      </div>

      {/* ==================================================================== */}
      {/* POST COMPOSER                                                        */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <form onSubmit={handlePublishPost} className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
              {currentProfile?.display_name?.charAt(0).toUpperCase() || 'M'}
            </div>
            <div className="flex-1">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What did you craft, invent, or discover in your workshop today?"
                rows={3}
                maxLength={5000}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <div className="flex justify-end pr-2 pt-1">
                <span className="text-[10px] text-slate-400">
                  {postContent.length} / 5000
                </span>
              </div>
            </div>
          </div>

          {/* Attached Image Preview */}
          {imagePreviewUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-h-72 flex items-center justify-center group">
              <img
                src={imagePreviewUrl}
                alt="Upload preview"
                className="max-h-72 w-auto object-contain rounded-2xl"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-black text-white shadow-md transition"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Composer Tool Belt: Skill, Project, Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Tag Skill */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Tag Associated Skill
              </label>
              <SkillSelector
                mode="single"
                skills={allSkills}
                selectedId={selectedSkillId}
                onChangeSingle={(id) => setSelectedSkillId(id || '')}
                placeholder="Tag a skill (optional)..."
              />
            </div>

            {/* Link Project */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Link to Project (Optional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none"
              >
                <option value="">No linked project</option>
                {userProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.is_public ? '🌍 (Public)' : '🔒 (Private)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opt-in to make linked project public */}
          {selectedProjectId && autoMakeProjectPublic && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  This project is currently private. Check this to publish its showcase so the community can view it!
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoMakeProjectPublic}
                onChange={(e) => setAutoMakeProjectPublic(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0 ml-3"
              />
            </div>
          )}

          {composerError && (
            <p className="text-xs font-semibold text-rose-500">{composerError}</p>
          )}

          {/* Composer Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <span>{imageFile ? 'Change Photo' : 'Attach Photo'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isPublishing || !postContent.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Share Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================================== */}
      {/* FEED FILTER BAR                                                      */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition',
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition',
              activeTab === 'mine'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            My Posts
          </button>
        </div>

        {/* Search & Skill Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts or @maker..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filterSkillId ? (
            <button
              onClick={() => setFilterSkillId('')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0 hover:bg-blue-500/20 transition"
              title="Clear skill filter"
            >
              <span>{allSkills.find((s) => s.id === filterSkillId)?.name || 'Filtered'}</span>
              <X className="w-3 h-3" />
            </button>
          ) : (
            <div className="w-36 shrink-0">
              <select
                value={filterSkillId}
                onChange={(e) => setFilterSkillId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs outline-none"
              >
                <option value="">All Skills</option>
                {allSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* FEED STREAM                                                          */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              No posts found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || filterSkillId
                ? 'Try broadening your search query or removing the active skill filter.'
                : 'Be the first maker to publish a workshop update or project showcase!'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isLiked = post.likes?.some((l: any) => l.user_id === currentUserId);
            const isAuthor = post.author_id === currentUserId;
            const canDelete = isAuthor || isAdmin;
            const commentsOpen = Boolean(expandedComments[post.id]);
            const postComments = postCommentsMap[post.id] || [];

            return (
              <article
                key={post.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Post Header */}
                <div className="p-5 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/makers/${post.author?.username || 'maker'}`}
                      className="group flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {post.author?.display_name?.charAt(0).toUpperCase() || 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                            {post.author?.display_name || 'Maker'}
                          </span>
                          {post.author?.role === 'ROOT_ADMIN' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white">
                              ROOT
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 hover:underline block">
                          @{post.author?.username || 'user'} · {relativeTime(post.created_at)}
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tagged Skill Pill */}
                    {post.skill && (
                      <button
                        onClick={() => setFilterSkillId(post.skill.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition flex items-center gap-1"
                        title="Filter feed by this skill"
                      >
                        <span>{post.skill.name}</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="px-5 pb-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content_md}
                  </p>
                </div>

                {/* Attached Image */}
                {post.image_url && (
                  <div
                    className="px-5 pb-3 cursor-pointer"
                    onClick={() => setLightboxImageUrl(post.image_url)}
                  >
                    <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-950/30 max-h-96 flex items-center justify-center">
                      <img
                        src={post.image_url}
                        alt="Community post attachment"
                        className="w-full max-h-96 object-cover hover:scale-[1.01] transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}

                {/* Linked Project Card */}
                {post.project && (
                  <div className="px-5 pb-3">
                    <Link
                      href={`/projects/${post.project.id}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                          🪵
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{post.project.name}</span>
                            {post.project.is_public ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Public Showcase
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Team Project
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Status: {post.project.status}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition" />
                    </Link>
                  </div>
                )}

                {/* Post Action Bar (Likes, Comments) */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={cn(
                        'flex items-center gap-1.5 font-bold transition px-2.5 py-1.5 rounded-xl',
                        isLiked
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <Heart
                        className={cn('w-4 h-4 transition-transform', isLiked && 'fill-current scale-110')}
                      />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    {/* Comment Button */}
                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className={cn(
                        'flex items-center gap-1.5 font-semibold transition px-2.5 py-1.5 rounded-xl',
                        commentsOpen
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                          : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments_count || 0} Comments</span>
                    </button>
                  </div>

                  {/* Share Link Copy */}
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/makers/${post.author?.username || 'maker'}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert('Maker profile link copied to clipboard!');
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Share maker profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* ========================================================= */}
                {/* EXPANDABLE COMMENTS SECTION                               */}
                {/* ========================================================= */}
                {commentsOpen && (
                  <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                    {/* Comments List */}
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {postComments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No comments yet. Start the conversation!
                        </p>
                      ) : (
                        postComments.map((comment) => {
                          const canDeleteComment =
                            comment.user_id === currentUserId || isAuthor || isAdmin;

                          return (
                            <div
                              key={comment.id}
                              className="flex items-start justify-between gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
                            >
                              <div className="flex items-start gap-2.5">
                                <Link href={`/makers/${comment.author?.username || 'maker'}`}>
                                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                                    {comment.author?.display_name?.charAt(0).toUpperCase() || 'M'}
                                  </div>
                                </Link>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/makers/${comment.author?.username || 'maker'}`}
                                      className="text-xs font-bold text-slate-900 dark:text-white hover:underline"
                                    >
                                      {comment.author?.display_name || 'Maker'}
                                    </Link>
                                    <span className="text-[10px] text-slate-400">
                                      {relativeTime(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-0.5">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>

                              {canDeleteComment && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* New Comment Input Form */}
                    <form
                      onSubmit={(e) => handleAddComment(post.id, e)}
                      className="flex items-center gap-2 pt-2"
                    >
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a supportive reply or ask a maker question..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength={2000}
                      />
                      <button
                        type="submit"
                        disabled={
                          submittingComment[post.id] || !(commentInputs[post.id] || '').trim()
                        }
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition shrink-0"
                      >
                        {submittingComment[post.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Reply'
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

      {/* ==================================================================== */}
      {/* IMAGE LIGHTBOX MODAL                                                 */}
      {/* ==================================================================== */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
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
