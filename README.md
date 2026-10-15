# Workbench

Workbench is a local-first project journal for tracking ideas, ongoing work, completed projects, and the skills you build along the way.

## Run it

Open `index.html` in a modern browser. No server or account is required.
For cloud sync with GitHub sign-in, serve this folder over localhost (for example, run `python -m http.server 8000` from this folder and open `http://localhost:8000`). Add that URL to the Supabase Auth allowed redirect URLs.

## What it does

- Track projects as planned, in progress, completed, postponed, or on hold.
- Describe projects, set a target date, and connect any number of skills.
- Set project priority, add searchable tags, and sort the project list by due date, priority, name, or most recent update.
- Use the Planner to review overdue and upcoming active projects, plus active projects without a target date.
- Add project checklists and dated progress-journal entries, and track checklist completion at a glance.
- Organize project photos into named folders and browse them in the gallery.
- Track skills with XP; every 100 XP advances a skill by one level. See when each skill was last practiced and browse a dated, skill-filterable practice log.
- Search and filter projects, and see recent updates and activity on the overview.
- Start with a starter collection of skills, including knitting, crocheting, electronics, programming, gongfu cha, cello, guqin, singing, and 3D modeling. Add, edit, or extend the list any time.

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

## Private cloud sync setup

Cloud sync is optional and uses a Supabase project that you own. Repeat the connection and sign-in steps in every browser you want to sync. Use the same Supabase project and GitHub account in each browser.

1. Create a Supabase project.
2. Open the project's **SQL Editor** and run the SQL below. It creates a per-user workspace table, a private photo bucket, and row-level/storage policies. Every row and photo is restricted to its signed-in owner.
3. In **Project Settings → API**, copy the Project URL and the **publishable** key (or legacy **anon** key). Never enter a `service_role` or secret key in this app.
4. If you use GitHub to sign in, open **Authentication → Sign In / Providers → GitHub** in Supabase and configure the GitHub OAuth app there. Add the local/hosted Workbench URL to Supabase's allowed redirect URLs.
5. In Workbench, open **Sync & backup**, save the URL and publishable/anon key, then choose **Continue with GitHub**.
6. To sync another browser, open the same app there, enter the same URL and key, and sign in with the same GitHub account.

```sql
create table public.workbench_workspace (
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

create policy "Users can access their own Workbench workspace"
  on public.workbench_workspace
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

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

On the first sign-in from another browser, Workbench downloads the cloud copy if its local workspace is empty. If both copies have changes, it pauses and asks which copy to keep rather than silently overwriting either one. Open browsers check for updates about every 30 seconds. Keep periodic exported backups as an additional recovery option.

Account credentials and the Supabase session are stored in that browser and sent only to the project URL you configured. The publishable/anon key is designed to be used by a client app; the database and storage policies above are what restrict access. Do not disable those policies.

The Supabase publishable/anon key is a project identifier for client apps, not a substitute for signing in. Workbench uses GitHub OAuth with a one-time PKCE verifier to identify your private user account. Do not use a GitHub personal access token, Supabase `service_role` key, or secret key in this app.
