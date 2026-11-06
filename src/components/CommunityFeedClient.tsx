'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Profile,
  SkillCatalog,
  PublicRecipeMarketplaceItem,
  PublicProjectMarketplaceItem,
} from '@/lib/types';
import { relativeTime, formatCurrency, cn } from '@/lib/utils';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import SkillSelector from '@/components/SkillSelector';
import UserAvatar from '@/components/UserAvatar';
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
  CornerDownRight,
  Check,
  Trophy,
  ArrowLeft,
  FlaskConical,
  FolderKanban,
  Star,
  GitFork,
  ArrowRight,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

interface CommunityFeedClientProps {
  initialPosts: any[];
  allSkills: SkillCatalog[];
  userProjects: Array<{ id: string; name: string; is_public: boolean; status: string }>;
  currentUserId: string;
  currentProfile: Profile | null;
  singlePostMode?: boolean;
  initialMarketplaceData?: {
    public_recipes: PublicRecipeMarketplaceItem[];
    public_projects: PublicProjectMarketplaceItem[];
  };
}

export default function CommunityFeedClient({
  initialPosts,
  allSkills,
  userProjects,
  currentUserId,
  currentProfile,
  singlePostMode = false,
  initialMarketplaceData,
}: CommunityFeedClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Navigation View State
  const [communityView, setCommunityView] = useState<'FEED' | 'FORMULAS' | 'SHOWCASES'>('FEED');

  // Feed State
  const [posts, setPosts] = useState<any[]>(initialPosts);

  // Marketplace Formulas State
  const [marketplaceRecipes, setMarketplaceRecipes] = useState<PublicRecipeMarketplaceItem[]>(
    initialMarketplaceData?.public_recipes || []
  );
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<string>('ALL');
  const [recipeSearch, setRecipeSearch] = useState<string>('');
  const [cloningRecipeId, setCloningRecipeId] = useState<string | null>(null);
  const [clonedRecipeIds, setClonedRecipeIds] = useState<Set<string>>(new Set());

  // Marketplace Project Showcases State
  const [marketplaceProjects, setMarketplaceProjects] = useState<PublicProjectMarketplaceItem[]>(
    initialMarketplaceData?.public_projects || []
  );
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
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
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>(
    singlePostMode && initialPosts[0]?.id ? { [initialPosts[0].id]: true } : {}
  );
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, { commentId: string; authorName: string } | null>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAdmin = currentProfile?.role === 'ROOT_ADMIN' || currentProfile?.role === 'ADMIN';

  // Keep posts in sync with initialPosts
  useEffect(() => {
    setPosts(initialPosts);
    if (singlePostMode && initialPosts[0]?.id) {
      handleToggleComments(initialPosts[0].id);
    }
  }, [initialPosts, singlePostMode]);

  function handleSharePost(postId: string) {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/community/${postId}`
      : `https://www.workbenchsoc.com/community/${postId}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setToastMessage('Post permalink copied to clipboard!');
        setTimeout(() => setToastMessage(null), 2500);
      }).catch(() => {
        prompt('Copy post permalink:', url);
      });
    } else {
      prompt('Copy post permalink:', url);
    }
  }

  // Clone Public Recipe to Workshop
  async function handleCloneRecipe(recipeId: string) {
    if (!currentUserId) {
      router.push('/login');
      return;
    }

    setCloningRecipeId(recipeId);
    try {
      const { data, error } = await supabase.rpc('clone_public_recipe', {
        p_source_recipe_id: recipeId,
      });

      if (error) throw error;

      sounds.playLevelUp();
      triggerCelebrationConfetti();

      setClonedRecipeIds((prev) => new Set(prev).add(recipeId));
      setMarketplaceRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId ? { ...r, clones_count: (r.clones_count || 0) + 1 } : r
        )
      );

      setToastMessage('Formula cloned to your workshop! Author awarded +50 XP!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to clone formula');
    } finally {
      setCloningRecipeId(null);
    }
  }

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

      setPostCommentsMap((prev) => ({
        ...prev,
        [postId]: enrichedComments,
      }));
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

  // Submit Comment or Threaded Reply
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

      // Update comments list and post comments_count
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

  // Filtered Formulas
  const filteredMarketplaceRecipes = marketplaceRecipes.filter((r) => {
    if (recipeCategoryFilter !== 'ALL' && r.category?.toUpperCase() !== recipeCategoryFilter) {
      return false;
    }
    if (recipeSearch.trim()) {
      const q = recipeSearch.toLowerCase();
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.instructions_md?.toLowerCase().includes(q);
      const matchAuthor =
        r.author?.username?.toLowerCase().includes(q) ||
        r.author?.display_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  // Filtered Projects
  const filteredMarketplaceProjects = marketplaceProjects.filter((p) => {
    if (projectStatusFilter !== 'ALL' && p.status !== projectStatusFilter) {
      return false;
    }
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      const matchPM =
        p.pm?.username?.toLowerCase().includes(q) ||
        p.pm?.display_name?.toLowerCase().includes(q);
      const matchSkills = (p.skill_names || []).some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchPM && !matchSkills) return false;
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          {singlePostMode ? (
            <Link
              href="/community"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Community Feed</span>
            </Link>
          ) : (
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
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Link
            href="/makers"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Discover Makers</span>
          </Link>

          {currentProfile?.username && (
            <Link
              href={`/makers/${currentProfile.username}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
            >
              <span>My Public Profile</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>
          )}
        </div>
      </div>

      {/* Top Marketplace & Community Tabs */}
      {!singlePostMode && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => setCommunityView('FEED')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition",
              communityView === 'FEED'
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Maker Feed</span>
          </button>

          <button
            onClick={() => setCommunityView('FORMULAS')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition",
              communityView === 'FORMULAS'
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <FlaskConical className="w-4 h-4 text-purple-500" />
            <span>Public Formulas Lab</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {marketplaceRecipes.length}
            </span>
          </button>

          <button
            onClick={() => setCommunityView('SHOWCASES')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition",
              communityView === 'SHOWCASES'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <FolderKanban className="w-4 h-4 text-indigo-500" />
            <span>Project Showcases</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {marketplaceProjects.length}
            </span>
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. SOCIAL FEED MODE                                                  */}
      {/* ==================================================================== */}
      {(singlePostMode || communityView === 'FEED') && (
        <>
          {/* POST COMPOSER / GUEST BANNER & FEED FILTER */}
          {!singlePostMode && (
            <>
          {!currentUserId ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-amber-500/10 border border-blue-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Join the Workbench Community</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
              Connect with fellow makers, share your builds, ask questions, and showcase live project blueprints. Sign in or create a free account to participate!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <form onSubmit={handlePublishPost} className="space-y-4">
            <div className="flex items-start gap-3">
              <UserAvatar
                src={currentProfile?.avatar_url}
                name={currentProfile?.display_name || currentProfile?.username}
                size="xl"
                shape="circle"
              />
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
      )}

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
        </>
      )}

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
                      <UserAvatar
                        src={post.author?.avatar_url}
                        name={post.author?.display_name || post.author?.username}
                        size="xl"
                        shape="circle"
                        className="group-hover:scale-105 transition-transform"
                      />
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

                  {/* Share Post Permalink Button */}
                  <button
                    onClick={() => handleSharePost(post.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Share post permalink"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="font-semibold text-xs hidden sm:inline">Share</span>
                  </button>
                </div>

                {/* ========================================================= */}
                {/* EXPANDABLE COMMENTS SECTION                               */}
                {/* ========================================================= */}
                {commentsOpen && (
                  <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                    {/* Comments List */}
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {postComments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No comments yet. Start the conversation!
                        </p>
                      ) : (
                        (() => {
                          const rootComments = postComments.filter((c) => !c.parent_comment_id);
                          const repliesByParent = postComments.reduce((acc: Record<string, any[]>, c) => {
                            if (c.parent_comment_id) {
                              acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
                              acc[c.parent_comment_id].push(c);
                            }
                            return acc;
                          }, {});

                          return rootComments.map((comment) => {
                            const canDeleteComment =
                              comment.user_id === currentUserId || isAuthor || isAdmin;
                            const replies = repliesByParent[comment.id] || [];

                            return (
                              <div key={comment.id} className="space-y-2">
                                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2.5">
                                      <Link href={`/makers/${comment.author?.username || 'maker'}`}>
                                        <UserAvatar
                                          src={comment.author?.avatar_url}
                                          name={comment.author?.display_name || comment.author?.username}
                                          size="sm"
                                          shape="circle"
                                        />
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
                                        <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-0.5 leading-relaxed">
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

                                  {/* Comment Action Bar: Like & Reply */}
                                  <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 pl-9">
                                    <button
                                      onClick={() => handleToggleCommentLike(post.id, comment.id)}
                                      className={cn(
                                        'flex items-center gap-1 text-[11px] font-medium transition',
                                        comment.is_liked
                                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                          : 'text-slate-400 hover:text-rose-600'
                                      )}
                                    >
                                      <Heart
                                        className={cn(
                                          'w-3.5 h-3.5',
                                          comment.is_liked && 'fill-rose-500 text-rose-500'
                                        )}
                                      />
                                      <span>{comment.likes_count || 0}</span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setReplyingTo((prev) => ({
                                          ...prev,
                                          [post.id]: {
                                            commentId: comment.id,
                                            authorName:
                                              comment.author?.display_name ||
                                              comment.author?.username ||
                                              'Maker',
                                          },
                                        }))
                                      }
                                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 font-medium transition"
                                    >
                                      <CornerDownRight className="w-3.5 h-3.5" />
                                      <span>Reply</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Threaded Replies Indented */}
                                {replies.length > 0 && (
                                  <div className="ml-6 pl-3 border-l-2 border-blue-500/20 dark:border-blue-500/20 space-y-2">
                                    {replies.map((reply) => {
                                      const canDeleteReply =
                                        reply.user_id === currentUserId || isAuthor || isAdmin;

                                      return (
                                        <div
                                          key={reply.id}
                                          className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2">
                                              <Link href={`/makers/${reply.author?.username || 'maker'}`}>
                                                <UserAvatar
                                                  src={reply.author?.avatar_url}
                                                  name={reply.author?.display_name || reply.author?.username}
                                                  size="xs"
                                                  shape="circle"
                                                />
                                              </Link>
                                              <div>
                                                <div className="flex items-center gap-1.5">
                                                  <Link
                                                    href={`/makers/${reply.author?.username || 'maker'}`}
                                                    className="text-xs font-bold text-slate-900 dark:text-white hover:underline"
                                                  >
                                                    {reply.author?.display_name || 'Maker'}
                                                  </Link>
                                                  <span className="text-[10px] text-slate-400">
                                                    {relativeTime(reply.created_at)}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-0.5">
                                                  {reply.content}
                                                </p>
                                              </div>
                                            </div>

                                            {canDeleteReply && (
                                              <button
                                                onClick={() => handleDeleteComment(post.id, reply.id)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                                                title="Delete reply"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>

                                          {/* Reply Action Bar: Like */}
                                          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50 pl-7">
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
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>

                    {/* Replying Banner */}
                    {replyingTo[post.id] && (
                      <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Replying to <strong>@{replyingTo[post.id]?.authorName}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo((prev) => ({ ...prev, [post.id]: null }))}
                          className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* New Comment Input Form */}
                    {!currentUserId ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          Sign in to like, comment, or share your builds.
                        </span>
                        <Link
                          href="/login"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shrink-0"
                        >
                          Sign In
                        </Link>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex items-center gap-2 pt-1"
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
                          placeholder={
                            replyingTo[post.id]
                              ? `Replying to @${replyingTo[post.id]?.authorName}...`
                              : 'Write a supportive reply or ask a maker question...'
                          }
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
                          ) : replyingTo[post.id] ? (
                            'Reply'
                          ) : (
                            'Comment'
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* 2. PUBLIC FORMULAS LAB VIEW                                          */}
      {/* ==================================================================== */}
      {!singlePostMode && communityView === 'FORMULAS' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Subheader & Search Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-500" />
                  <span>Public Formulas &amp; Recipe Marketplace</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Browse battle-tested artisan ratios, resin mixes, and candle formulas. 1-click clone directly into your workshop.
                </p>
              </div>

              <Link
                href="/inventory"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition shrink-0 self-start sm:self-auto"
              >
                <span>My Formulas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Filter Search & Category Pills */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search public formulas, craft instructions, ingredients, or @maker..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
                {recipeSearch && (
                  <button
                    onClick={() => setRecipeSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'ALL', label: 'All Formulas' },
                  { id: 'RESIN', label: 'Resin & Epoxy' },
                  { id: '3D_PRINT', label: '3D Printing' },
                  { id: 'SILICONE', label: 'Silicone Mold' },
                  { id: 'PERFUME', label: 'Perfume' },
                  { id: 'SOAP', label: 'Cold/Hot Soap' },
                  { id: 'CANDLE', label: 'Candle Batch' },
                  { id: 'LASER_CNC', label: 'Laser & CNC' },
                  { id: 'CROSS_STITCH', label: 'Cross-Stitch' },
                  { id: 'ELECTRONICS', label: 'Electronics' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setRecipeCategoryFilter(cat.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0",
                      recipeCategoryFilter === cat.id
                        ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Formulas Grid */}
          {filteredMarketplaceRecipes.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No public formulas found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                {recipeSearch || recipeCategoryFilter !== 'ALL'
                  ? 'Try broadening your search query or choosing another craft category.'
                  : 'Be the first to share a public formula from your workshop inventory!'}
              </p>
              <Link
                href="/inventory"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition"
              >
                <span>Open Workshop &amp; Formulas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMarketplaceRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-purple-300 dark:hover:border-purple-900/60 transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Author & Category Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Link
                        href={`/makers/${recipe.author?.username || 'maker'}`}
                        className="flex items-center gap-2 group min-w-0"
                      >
                        <UserAvatar
                          src={recipe.author?.avatar_url}
                          name={recipe.author?.display_name || recipe.author?.username}
                          size="sm"
                          shape="circle"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition block truncate">
                            {recipe.author?.display_name || 'Maker'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            @{recipe.author?.username || 'maker'}
                          </span>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                          {recipe.category || 'Formula'}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{(recipe.rating || 5.0).toFixed(1)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Optional Photo Thumbnail */}
                    {recipe.image_url && (
                      <div
                        className="relative w-full h-40 rounded-2xl overflow-hidden mb-3 bg-slate-950 cursor-pointer group"
                        onClick={() => setLightboxImageUrl(recipe.image_url)}
                      >
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                          Click to Zoom
                        </div>
                      </div>
                    )}

                    {/* Title & Instructions */}
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 line-clamp-1">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {recipe.instructions_md || 'No written instructions provided for this formula.'}
                    </p>
                  </div>

                  {/* Footer Stats & 1-Click Clone Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold" title="Ingredients count">
                        <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                        <span>{recipe.ingredients_count} ingredients</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold" title="Times cloned">
                        <GitFork className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{recipe.clones_count || 0} clones</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleCloneRecipe(recipe.id)}
                      disabled={cloningRecipeId === recipe.id || clonedRecipeIds.has(recipe.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm",
                        clonedRecipeIds.has(recipe.id)
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default"
                          : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 disabled:opacity-50"
                      )}
                    >
                      {cloningRecipeId === recipe.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cloning...</span>
                        </>
                      ) : clonedRecipeIds.has(recipe.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In My Workshop</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Clone (+50 XP)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. PROJECT SHOWCASES VIEW                                             */}
      {/* ==================================================================== */}
      {!singlePostMode && communityView === 'SHOWCASES' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Subheader & Search Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-500" />
                  <span>Public Project Blueprints &amp; Showcases</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Explore real-world maker hardware builds, cosplay blueprints, and software roadmaps with live milestones.
                </p>
              </div>

              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shrink-0 self-start sm:self-auto"
              >
                <span>My Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Filter Search & Status */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search project blueprints, skills, or project leads..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {projectSearch && (
                  <button
                    onClick={() => setProjectSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setProjectStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                      projectStatusFilter === status
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {status === 'ALL' ? 'All Statuses' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Showcases Grid */}
          {filteredMarketplaceProjects.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No public project showcases found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                {projectSearch || projectStatusFilter !== 'ALL'
                  ? 'Try broadening your search query or clearing the status filter.'
                  : 'Publish your project blueprint to the community to share your progress!'}
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
              >
                <span>Create or Manage Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMarketplaceProjects.map((proj) => {
                const progressPct =
                  proj.total_tasks > 0
                    ? Math.round((proj.completed_tasks / proj.total_tasks) * 100)
                    : 0;

                return (
                  <div
                    key={proj.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900/60 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* PM & Status Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Link
                          href={`/makers/${proj.pm?.username || 'maker'}`}
                          className="flex items-center gap-2 group min-w-0"
                        >
                          <UserAvatar
                            src={proj.pm?.avatar_url}
                            name={proj.pm?.display_name || proj.pm?.username}
                            size="sm"
                            shape="circle"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition block truncate">
                              {proj.pm?.display_name || 'Project Lead'}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              @{proj.pm?.username || 'maker'}
                            </span>
                          </div>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              proj.status === 'COMPLETED'
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                            )}
                          >
                            {proj.status}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                            <Trophy className="w-3 h-3" />
                            <span>+{proj.completion_xp_reward} XP</span>
                          </span>
                        </div>
                      </div>

                      {/* Project Name & Description */}
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 line-clamp-1">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {proj.description || 'Public engineering blueprint and task roadmap.'}
                      </p>

                      {/* Skills Linked */}
                      {Array.isArray(proj.skill_names) && proj.skill_names.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-3">
                          {proj.skill_names.slice(0, 3).map((skillName, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                            >
                              {skillName}
                            </span>
                          ))}
                          {proj.skill_names.length > 3 && (
                            <span className="text-[10px] font-bold text-slate-400">
                              +{proj.skill_names.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Tasks Progress
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {proj.completed_tasks} / {proj.total_tasks} completed ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Budget & View Blueprint Link */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        {proj.budget_limit > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Budget: {formatCurrency(proj.budget_limit, proj.currency || 'USD')}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Open-ended project</span>
                        )}
                      </div>

                      <Link
                        href={`/projects/${proj.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                      >
                        <span>View Blueprint</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
