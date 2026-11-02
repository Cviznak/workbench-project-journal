# Workbench — Gamified Productivity & Project Management

A production-ready, globally secure, full-stack Gamified Productivity & Project Management web application built with **Next.js 14 (App Router, TypeScript, Tailwind CSS)** and **Supabase (PostgreSQL + Supabase Auth + Row Level Security)**.

---

## 1. Security & Architecture Highlights

- **Zero-Trust Client XP & Roles:** Users cannot spoof XP, levels, task rewards, or admin roles. All XP grants, level-up calculations, task completions, and role promotions are strictly executed inside PostgreSQL `SECURITY DEFINER` RPC functions with server-validated `auth.uid()`.
- **Deterministic Level Formula:** `level = floor(0.1 * sqrt(total_xp)) + 1` (a quadratic RPG progression curve).
- **The Immutable Genesis Admin:**
  - The first user to register automatically becomes the immutable `ROOT_ADMIN`.
  - Protected by a PostgreSQL `BEFORE UPDATE OR DELETE` trigger (`protect_root_admin`) that prevents deleting, demoting, or suspending the Root Admin even by other administrators.
- **Strict Row Level Security (RLS) Everywhere:**
  - `workspace_items` (Ideas & Notes) are strictly private to the owner.
  - Projects, tasks, and members are visible only to verified project members or admins via the `is_project_member(project_id)` security helper.
- **Dual XP Engine:**
  - **Individual Task Completion XP (`complete_project_task`):** Moving a task to `DONE` awards individual XP to the assignee and auto-unlocks the skill if they haven't practiced it before.
  - **Team-Wide Project Completion XP (`complete_project`):** Marking a project `COMPLETED` awards completion XP to every team member across all project skills.

---

## 2. Supabase Setup Instructions

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open [`supabase/migrations/001_init_schema_and_rls.sql`](./supabase/migrations/001_init_schema_and_rls.sql), copy its contents, and run it.
4. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**
5. Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
6. (Recommended) In Supabase **Authentication → Providers → Email**, disable "Confirm email" for instant logins during development.

---

## 3. Local Development & Deployment

### Run Locally
```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy to Vercel
1. Push this repository to GitHub.
2. Import the repository in [vercel.com](https://vercel.com).
3. Set the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!
