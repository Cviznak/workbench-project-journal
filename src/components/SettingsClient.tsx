'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  User,
  Shield,
  KeyRound,
  Check,
  Loader2,
  Lock,
  LogOut,
  AlertCircle,
  Download,
  Database,
  FileText,
} from 'lucide-react';

interface SettingsClientProps {
  profile: Profile;
  email: string;
}

export default function SettingsClient({ profile, email }: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Data Export state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  async function handleExportData() {
    setExporting(true);
    setExportSuccess(false);

    try {
      const { data, error } = await supabase.rpc('export_user_maker_archive');
      if (error) throw error;

      if (!data) {
        throw new Error('No data received from export function');
      }

      // Convert to formatted JSON
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Trigger timestamped download
      const dateStr = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `workbench_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to export maker archive');
    } finally {
      setExporting(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', profile.id);

      if (error) throw error;

      setProfileSuccess(true);
      router.refresh();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Profile &amp; Account Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your maker profile and security credentials.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Public Maker Profile
            </h2>
            <p className="text-xs text-slate-400">
              Your name as shown on project boards, task cards, and XP leaderboards.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Username (Immutable Handle)
              </label>
              <input
                type="text"
                disabled
                value={`@${profile.username}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Role:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {profile.role}
              </span>
              {profile.is_immutable && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Immutable Root</span>
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {profileSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : profileSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security Credentials Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Change Password
            </h2>
            <p className="text-xs text-slate-400">
              Ensure your account uses a secure password.
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving || !password}
              className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {passwordSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : passwordSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Password Updated!</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Data & Backup Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Data &amp; Backup (Portable Archive)
            </h2>
            <p className="text-xs text-slate-400">
              Export your complete Workbench data ledger into a standardized portable JSON archive.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Maker Archive Contents</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Your export includes your complete profile data, unlocked skills &amp; XP progression, deliberate practice session logs, private workspace ideas &amp; notes, collaborative projects, assigned tasks, comments, and audit activity ledger.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">Format: Standard JSON (v1.3.0)</span>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm shadow-blue-500/20"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Archive...</span>
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Archive Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Complete Maker Archive (JSON)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSignOut}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Account</span>
        </button>
      </div>
    </div>
  );
}
