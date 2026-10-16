# Workbench

Workbench is a local-first project journal for tracking ideas, ongoing work, completed projects, and the skills you build along the way.

## Run it

Open `index.html` in a modern browser. No server or account is required.
For cloud sync with GitHub sign-in, serve this folder over localhost (for example, run `python -m http.server 8000` from this folder and open `http://localhost:8000`). Add that URL to the Supabase Auth allowed redirect URLs.

## What it does

- Track projects as planned, in progress, completed, postponed, or on hold.
- Describe projects, set a target date, and connect any number of skills.
- Set project priority, add searchable tags, and sort the project list by due date, priority, name, or most recent update.
- Filter projects by status, specific skill, or click any tag chip to instantly filter.
- Use the Planner to review overdue and upcoming active projects, plus active projects without a target date.
- Add project checklists (with reordering and in-place editing) and dated progress-journal entries, tracking checklist completion at a glance.
- Organize project photos into named folders (with rename and delete support), automatically optimize image uploads, and view photos in a full-screen lightbox.
- Track skills with XP; every 100 XP advances a skill by one level. Edit, delete, or extend skills at any time, see when each skill was last practiced, and browse a dated, skill-filterable practice log.
- Light and dark theme toggle with automatic system preference detection.
- Installable Progressive Web App (PWA) with offline caching via Service Worker.
- Start with a starter collection of skills, including knitting, crocheting, electronics, programming, gongfu cha, cello, guqin, singing, and 3D modeling. Edit, delete, or extend the list any time.

Project data and photos are stored in IndexedDB in the current browser on this device. Clearing the browser's site data will remove this local copy. Use **Sync & backup** to connect your own Supabase project for cross-browser sync and to export/import a portable JSON backup.

## Host on GitHub Pages

Workbench is a static HTML/CSS/JavaScript app, so it can be hosted on GitHub Pages without a build step. The source repository must be public to use GitHub Pages for free on GitHub Free. The app's project data is not stored in this repository: local data stays in that browser, and optional cross-browser data stays in your Supabase project.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
3. Wait for the Pages deployment to finish. The site will be at `https://<owner>.github.io/<repository>/`.
4. To use GitHub sign-in and cloud sync on the hosted app, open Supabase **Authentication → URL Configuration**. Set **Site URL** to the hosted app URL and add `https://<owner>.github.io/<repository>/**` to **Redirect URLs**. Keep the Supabase Auth callback URL configured in your GitHub OAuth App; it remains `https://<project-ref>.supabase.co/auth/v1/callback`.

GitHub Pages serves static files only; it does not provide a database or hide source code. Keep Supabase row-level security and private Storage policies enabled. Never publish a Supabase secret or `service_role` key. The publishable/anon key is intended for browser apps when access is protected by those policies.

Workbench uses GitHub OAuth for cloud sign-in; it does not ask for or store a GitHub password. GitHub Pages is suitable for this static app, but never put private credentials or Supabase secret/service-role keys in its source.

GitHub Pages is free for public repositories. Published sites must be no larger than 1 GB, with a soft bandwidth limit of 100 GB/month and a soft limit of 10 builds/hour. It is intended for static sites, not high-traffic commercial hosting. Supabase has separate free-plan quotas: currently 500 MB database, 1 GB file storage, and free projects may pause after a week without activity. Project photos use Supabase Storage, so keep an eye on that quota. Check the providers' current limits before relying on the free tiers:

- [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Supabase pricing and quotas](https://supabase.com/pricing)

## Multi-user cloud accounts & Admin Console

Workbench supports multi-user collaboration and isolated maker workbenches powered by Supabase. Makers can sign in from any device (phone, laptop, tablet) to access their own private workbench, while Shop Leads/Admins can manage members and inspect workspaces.

### Account Roles

- **Maker**: Each maker receives a private, isolated workbench. Their projects, checklists, photos, inventory, skills, and practice XP are isolated to their own account.
- **Admin / Shop Lead**: Admins have full access to their own personal workbench, plus the **Admin Hub** navigation link. In the Admin Hub, admins can:
  - View aggregate workshop metrics (total registered makers, total projects, total hours invested, active makers this week).
  - Search and filter makers by name, email, or role (`maker` vs `admin`).
  - Promote makers to admin or demote admins to maker.
  - **Inspect Workbench**: Inspect another maker's workbench in a safe, read-only mode to review progress, photos, and project notes. Changes and syncs are disabled during inspection to ensure zero data overwrites.
  - Register new maker accounts directly from the admin console.

### Private cloud sync & multi-user setup

Cloud accounts and sync use your own Supabase project.

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the project's **SQL Editor** and run the setup script below. It creates:
   - `workbench_workspace`: Per-user isolated workspace data.
   - `workbench_profiles`: User directory and role management (`maker` vs `admin`).
   - `workbench-photos`: Private Supabase Storage bucket scoped to each user ID.
   - Row-level security (RLS) policies granting users access to their own data and permitting admins to view the maker directory.
3. In **Project Settings → API**, copy the **Project URL** and the **anon / publishable** key.
4. In Workbench, click **Sign In** in the top bar or sidebar, switch to the **⚙️ Cloud Setup** tab, paste the Project URL and key, and click **Save Connection**.
6. **Disable Email Confirmation (Avoid 429 Rate Limits)**: In Supabase, go to **Authentication → Providers → Email** and toggle **OFF** `Confirm email`. Supabase's free-tier default SMTP server limits confirmation emails to ~3 per hour. Disabling email confirmation allows instant, unlimited maker registrations without getting `429: email rate limit exceeded`. Any standard email address (e.g. `@gmail.com`, `@outlook.com`) can be used.
7. **Invite makers with One-Click Links**: Click **🔗 Copy One-Click Invite Link** in the Admin Console or Cloud Setup modal. Send this link to any maker or to your own phone. When opened, it connects instantly and prompts them to register their account—no manual copying of API keys needed, and no credentials committed to git!

```sql
-- 1. User Workspaces
create table if not exists public.workbench_workspace (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workbench_workspace enable row level security;
grant select, insert, update, delete on public.workbench_workspace to authenticated;

create or replace function public.workbench_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

drop trigger if exists workbench_workspace_updated_at on public.workbench_workspace;
create trigger workbench_workspace_updated_at
  before update on public.workbench_workspace
  for each row execute function public.workbench_set_updated_at();

-- 2. User Profiles & Directory
create table if not exists public.workbench_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text default 'maker',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.workbench_profiles enable row level security;
grant select, insert, update on public.workbench_profiles to authenticated;

drop policy if exists "Profiles viewable by authenticated" on public.workbench_profiles;
create policy "Profiles viewable by authenticated" on public.workbench_profiles for select to authenticated using (true);

drop policy if exists "Users can update own profile" on public.workbench_profiles;
create policy "Users can update own profile" on public.workbench_profiles for update to authenticated using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.workbench_profiles;
create policy "Users can insert own profile" on public.workbench_profiles for insert to authenticated with check (auth.uid() = id);

-- 3. Workspace RLS Policies (Owner access + Admin inspection)
drop policy if exists "Users can access their own Workbench workspace" on public.workbench_workspace;
create policy "Users can access their own Workbench workspace"
  on public.workbench_workspace
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all workspaces" on public.workbench_workspace;
create policy "Admins can view all workspaces"
  on public.workbench_workspace
  for select
  to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.workbench_profiles where id = auth.uid() and role = 'admin'));

-- 4. Storage Bucket for Project Photos
insert into storage.buckets (id, name, public)
values ('workbench-photos', 'workbench-photos', false)
on conflict (id) do update set public = false;

create policy "Users can read their own Workbench photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'workbench-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload their own Workbench photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'workbench-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own Workbench photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'workbench-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'workbench-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own Workbench photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'workbench-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

### Data Isolation & Conflict Safety

- **Local Storage Isolation**: Each user's state is keyed in IndexedDB by their user ID (`workbench_state_<userId>`). Signing out or switching users immediately switches the active workspace in IndexedDB and re-renders the UI without state leakage.
- **Guest / Offline Mode**: Without logging in, users can use Workbench in Guest mode; data is stored in the browser under `workbench_state_local`.
- **Admin Inspection Safety**: When an admin inspects another maker's workbench, the active state is backed up in memory, remote sync triggers are silenced (`adminInspectionActive = true`), and the inspected workbench is loaded in read-only mode. Exiting inspection mode cleanly restores the admin's personal workbench.

