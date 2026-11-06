import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CommunityFeedClient from '@/components/CommunityFeedClient';

interface PostDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PostDetailPageProps) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('community_posts')
    .select('title, content_md, image_url, author:profiles!community_posts_author_id_fkey(display_name, username)')
    .eq('id', params.id)
    .single();

  if (!post) {
    return {
      title: 'Post Not Found | Workbench Community',
    };
  }

  const author = Array.isArray(post.author) ? post.author[0] : post.author;
  const authorName = author?.display_name || author?.username || 'Maker';
  const cleanSnippet = post.content_md
    ? post.content_md.replace(/\s+/g, ' ').trim().slice(0, 160)
    : post.title || 'Workshop update on Workbench';
  const ogImageUrl = post.image_url || 'https://www.workbenchsoc.com/og-image.png';

  const pageTitle = post.title
    ? `${post.title} by ${authorName} | Workbench Community`
    : `${authorName}'s Update | Workbench Community`;

  return {
    title: pageTitle,
    description: cleanSnippet,
    openGraph: {
      title: pageTitle,
      description: cleanSnippet,
      url: `https://www.workbenchsoc.com/community/${params.id}`,
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${authorName}'s update on Workbench`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: cleanSnippet,
      images: [ogImageUrl],
    },
  };
}

export default async function CommunityPostDetailPage({ params }: PostDetailPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: post, error: postErr },
    { data: allSkills },
    userProjectsRes,
    currentProfileRes,
  ] = await Promise.all([
    supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_author_id_fkey(*),
        skill:skill_catalog(*),
        project:projects(id, name, status, is_public),
        likes:post_likes(user_id)
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('skill_catalog')
      .select('*')
      .order('name'),
    user
      ? supabase
          .from('projects')
          .select('id, name, is_public, status')
          .eq('pm_user_id', user.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (postErr || !post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {!user && (
        <header className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/30">
              W
            </span>
            <span className="font-black text-slate-900 dark:text-white tracking-tight">Workbench</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/makers"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Makers
            </Link>
            <Link
              href="/tools"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Calculators
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              Join Free
            </Link>
          </div>
        </header>
      )}

      <CommunityFeedClient
        initialPosts={[post]}
        allSkills={allSkills || []}
        userProjects={(userProjectsRes?.data as any) || []}
        currentUserId={user?.id || ''}
        currentProfile={currentProfileRes?.data || null}
        singlePostMode={true}
      />
    </div>
  );
}
