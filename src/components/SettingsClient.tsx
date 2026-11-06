'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';
import { useTranslation, SUPPORTED_LANGUAGES, Language } from '@/lib/i18n';
import { Currency } from '@/lib/types';
import { CURRENCY_SYMBOLS, DEFAULT_CURRENCY, getPreferredCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';
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
  UploadCloud,
  FolderTree,
  Boxes,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  Bell,
  Mail,
  Coffee,
  Globe,
} from 'lucide-react';
import AvatarUploader from '@/components/AvatarUploader';

interface SettingsClientProps {
  profile: Profile;
  email: string;
}

export default function SettingsClient({ profile, email }: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [supportUrl, setSupportUrl] = useState(profile.support_url || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Notification Preferences state (saved to profiles.settings_json)
  const isAdmin = profile.role === 'ROOT_ADMIN' || profile.role === 'ADMIN';
  const [settings, setSettings] = useState<Record<string, any>>(profile.settings_json || {});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  async function handleToggleSetting(key: string, value: boolean) {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    setSettingsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ settings_json: nextSettings })
        .eq('id', profile.id);

      if (error) throw error;
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2500);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences');
      setSettings(settings); // revert on error
    } finally {
      setSettingsSaving(false);
    }
  }

  // Localization state & handlers
  const { language: currentLanguage, setLanguage } = useTranslation();
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(() => {
    return ((settings.preferred_currency as Currency) || getPreferredCurrency());
  });
  const [localizationSuccess, setLocalizationSuccess] = useState(false);

  async function handleUpdateLanguage(newLang: Language) {
    setLanguage(newLang);
    const nextSettings = { ...settings, language: newLang };
    setSettings(nextSettings);
    try {
      await supabase.from('profiles').update({ settings_json: nextSettings }).eq('id', profile.id);
      setLocalizationSuccess(true);
      setTimeout(() => setLocalizationSuccess(false), 2500);
      router.refresh();
    } catch (_) {}
  }

  async function handleUpdateCurrency(newCurr: Currency) {
    setCurrentCurrency(newCurr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('workbench_currency', newCurr);
      window.dispatchEvent(new Event('workbench_currency_changed'));
    }
    const nextSettings = { ...settings, preferred_currency: newCurr };
    setSettings(nextSettings);
    try {
      await supabase.from('profiles').update({ settings_json: nextSettings }).eq('id', profile.id);
      setLocalizationSuccess(true);
      setTimeout(() => setLocalizationSuccess(false), 2500);
      router.refresh();
    } catch (_) {}
  }

  const [password, setPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Data Export state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Data Restore state
  const [restoring, setRestoring] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [archiveData, setArchiveData] = useState<any | null>(null);
  const [restoreStats, setRestoreStats] = useState<{
    folders: number;
    items: number;
    recipes: number;
    notes: number;
    runs: number;
  }>({ folders: 0, items: 0, recipes: 0, notes: 0, runs: 0 });
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object' || !parsed.version) {
          throw new Error('Invalid archive format. Missing version header.');
        }

        const foldersCount = Array.isArray(parsed.inventory_folders) ? parsed.inventory_folders.length : 0;
        const itemsCount = Array.isArray(parsed.inventory_items) ? parsed.inventory_items.length : 0;
        const recipesCount = Array.isArray(parsed.maker_recipes) ? parsed.maker_recipes.length : 0;
        const notesCount = Array.isArray(parsed.workspace_items) ? parsed.workspace_items.length : 0;
        const runsCount = Array.isArray(parsed.recipe_runs) ? parsed.recipe_runs.length : 0;

        setArchiveData(parsed);
        setRestoreStats({
          folders: foldersCount,
          items: itemsCount,
          recipes: recipesCount,
          notes: notesCount,
          runs: runsCount,
        });
        setRestoreModalOpen(true);
      } catch (err: any) {
        alert(`Archive parse error: ${err.message || 'Invalid JSON file'}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExecuteRestore() {
    if (!archiveData) return;
    setRestoring(true);

    try {
      const mappedFolderIds: Record<string, string> = {};
      const mappedItemIds: Record<string, string> = {};
      const mappedRecipeIds: Record<string, string> = {};

      // 1. Fetch user's existing folders and items to avoid duplicate conflicts
      const { data: existingFolders } = await supabase
        .from('inventory_folders')
        .select('id, name')
        .eq('user_id', profile.id);

      const { data: existingItems } = await supabase
        .from('inventory_items')
        .select('id, name, item_type')
        .eq('user_id', profile.id);

      const { data: existingRecipes } = await supabase
        .from('maker_recipes')
        .select('id, title')
        .eq('user_id', profile.id);

      const { data: existingNotes } = await supabase
        .from('workspace_items')
        .select('id, title')
        .eq('user_id', profile.id);

      // 2. Restore Inventory Folders
      if (Array.isArray(archiveData.inventory_folders)) {
        for (const f of archiveData.inventory_folders) {
          const matched = existingFolders?.find(
            (ef) => ef.name.trim().toLowerCase() === f.name.trim().toLowerCase()
          );
          if (matched) {
            mappedFolderIds[f.id] = matched.id;
          } else {
            const { data: newF, error: fErr } = await supabase
              .from('inventory_folders')
              .insert({
                user_id: profile.id,
                name: f.name.trim(),
                color: f.color || '#6366f1',
                icon: f.icon || 'folder',
              })
              .select('id')
              .single();

            if (!fErr && newF) {
              mappedFolderIds[f.id] = newF.id;
            }
          }
        }
      }

      // 3. Restore Inventory Items
      if (Array.isArray(archiveData.inventory_items)) {
        for (const item of archiveData.inventory_items) {
          const matched = existingItems?.find(
            (ei) =>
              ei.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
              ei.item_type === item.item_type
          );
          if (matched) {
            mappedItemIds[item.id] = matched.id;
          } else {
            const targetFolderId = item.folder_id ? mappedFolderIds[item.folder_id] || null : null;
            const { data: newItem, error: iErr } = await supabase
              .from('inventory_items')
              .insert({
                user_id: profile.id,
                name: item.name.trim(),
                folder_id: targetFolderId,
                item_type: item.item_type || 'MATERIAL',
                description: item.description || '',
                sku_or_location: item.sku_or_location || '',
                quantity: Number(item.quantity) || 0,
                unit: item.unit || 'pcs',
                low_stock_threshold: Number(item.low_stock_threshold) || 0,
                unit_price: Number(item.unit_price) || 0,
                currency: item.currency || 'ILS',
                condition: item.condition || 'GOOD',
                search_keyword: item.search_keyword || '',
                reorder_url: item.reorder_url || '',
                in_restock_cart: Boolean(item.in_restock_cart),
                restock_target_qty: Number(item.restock_target_qty) || 1,
              })
              .select('id')
              .single();

            if (!iErr && newItem) {
              mappedItemIds[item.id] = newItem.id;
            }
          }
        }
      }

      // 4. Restore Maker Recipes
      if (Array.isArray(archiveData.maker_recipes)) {
        for (const r of archiveData.maker_recipes) {
          const matched = existingRecipes?.find(
            (er) => er.title.trim().toLowerCase() === r.title.trim().toLowerCase()
          );
          if (matched) {
            mappedRecipeIds[r.id] = matched.id;
          } else {
            const targetOutputItemId = r.output_item_id ? mappedItemIds[r.output_item_id] || null : null;
            const { data: newR, error: rErr } = await supabase
              .from('maker_recipes')
              .insert({
                user_id: profile.id,
                title: r.title.trim(),
                category: r.category || 'General',
                instructions_md: r.instructions_md || '',
                rating: r.rating || 5,
                output_item_id: targetOutputItemId,
                output_yield_qty: Number(r.output_yield_qty) || 1,
                packaging_overhead: Number(r.packaging_overhead) ?? 4.5,
                target_retail_price: Number(r.target_retail_price) || 0,
              })
              .select('id')
              .single();

            if (!rErr && newR) {
              mappedRecipeIds[r.id] = newR.id;
            }
          }
        }
      }

      // 5. Restore Recipe Ingredients
      if (Array.isArray(archiveData.recipe_ingredients)) {
        for (const ing of archiveData.recipe_ingredients) {
          const newRecipeId = mappedRecipeIds[ing.recipe_id];
          const newItemId = mappedItemIds[ing.inventory_item_id];
          if (newRecipeId && newItemId) {
            await supabase
              .from('recipe_ingredients')
              .upsert(
                {
                  recipe_id: newRecipeId,
                  inventory_item_id: newItemId,
                  quantity_required: Number(ing.quantity_required) || 1,
                },
                { onConflict: 'recipe_id,inventory_item_id' }
              );
          }
        }
      }

      // 5b. Restore Recipe Batch Run History
      if (Array.isArray(archiveData.recipe_runs)) {
        for (const run of archiveData.recipe_runs) {
          const newRecipeId = mappedRecipeIds[run.recipe_id];
          if (newRecipeId) {
            await supabase.from('recipe_runs').insert({
              recipe_id: newRecipeId,
              user_id: profile.id,
              batch_multiplier: Number(run.batch_multiplier) || 1,
              units_produced: Number(run.units_produced) || 1,
              total_batch_cost: Number(run.total_batch_cost) || 0,
              unit_cogs: Number(run.unit_cogs) || 0,
              outcome_rating: run.outcome_rating || null,
              batch_notes: run.batch_notes || '',
              created_at: run.created_at || new Date().toISOString(),
            });
          }
        }
      }

      // 6. Restore Workspace Notes
      if (Array.isArray(archiveData.workspace_items)) {
        for (const wi of archiveData.workspace_items) {
          const matched = existingNotes?.find(
            (en) => en.title.trim().toLowerCase() === wi.title.trim().toLowerCase()
          );
          if (!matched) {
            await supabase.from('workspace_items').insert({
              user_id: profile.id,
              item_type: wi.item_type || 'IDEA',
              title: wi.title.trim(),
              content_md: wi.content_md || wi.content || '',
              tags: wi.tags || [],
              idea_status: wi.idea_status || 'RAW',
              is_pinned: Boolean(wi.is_pinned),
              metadata_json: wi.metadata_json || {},
            });
          }
        }
      }

      // 7. Log Restore event to activity ledger
      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        event_type: 'ARCHIVE_RESTORED',
        summary: `Restored Maker Archive JSON (v${archiveData.version || '1.7.0'})`,
        metadata: {
          restored_stats: restoreStats,
          version: archiveData.version,
        },
      });

      setRestoreSuccess('Archive restored successfully! Folders, items, and formulas have been merged.');
      setRestoreModalOpen(false);
      setArchiveData(null);
      router.refresh();
      setTimeout(() => setRestoreSuccess(null), 5000);
    } catch (err: any) {
      alert(`Restore failed: ${err.message || 'Unknown error'}`);
    } finally {
      setRestoring(false);
    }
  }

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

    const cleanUrl = supportUrl.trim();
    if (
      cleanUrl &&
      !cleanUrl.match(
        /^https:\/\/(www\.)?(buymeacoffee\.com|ko-fi\.com|patreon\.com)\/[A-Za-z0-9_.-]+\/?$/
      )
    ) {
      alert(
        'Creator tip link must be a valid Buy Me a Coffee, Ko-fi, or Patreon URL (e.g. https://buymeacoffee.com/username)'
      );
      setProfileSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          support_url: cleanUrl,
        })
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

        {/* Profile Avatar Uploader */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            Profile Picture
          </label>
          <AvatarUploader
            userId={profile.id}
            username={profile.username}
            currentAvatarUrl={avatarUrl}
            onAvatarUpdated={(newUrl) => {
              setAvatarUrl(newUrl);
              router.refresh();
            }}
            size="xl"
            shape="circle"
          />
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-500 fill-current" />
                <span>Creator Tip Jar / Buy Me a Coffee URL</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">optional &bull; shown on public profile</span>
            </label>
            <input
              type="url"
              placeholder="https://buymeacoffee.com/yourhandle (or Ko-fi / Patreon)"
              value={supportUrl}
              onChange={(e) => setSupportUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              When configured, a &quot;Buy @{profile.username} a Coffee&quot; button will appear on your Public Maker Profile.
            </p>
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

      {/* Notifications & Admin Alerts Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Notifications &amp; Alerts
              </h2>
              <p className="text-xs text-slate-400">
                Configure your real-time notification feed and administrator email alerts.
              </p>
            </div>
          </div>

          {settingsSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Admin Email Skill Requests Toggle (Only shown to Admins) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Admin Email: New Skill Requests
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Receive immediate transactional email alerts to your registered email when a maker submits a new skill proposal for catalog review.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  disabled={settingsSaving}
                  checked={settings.email_skill_requests !== false}
                  onChange={(e) => handleToggleSetting('email_skill_requests', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}

          {/* In-App Skill Requests for Admins */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    In-App Bell: Skill Proposal Alerts
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Show unread notification bell badges when new skills require review in the Admin Hub.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  disabled={settingsSaving}
                  checked={settings.in_app_skill_requests !== false}
                  onChange={(e) => handleToggleSetting('in_app_skill_requests', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}

          {/* In-App Post Likes & Comments for All Users */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  Community Social Activity
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive notifications when other makers like your posts or leave comments on your updates.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                disabled={settingsSaving}
                checked={settings.in_app_social !== false}
                onChange={(e) => handleToggleSetting('in_app_social', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Project Invitation Emails */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  Project Invitation Emails
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive transactional email alerts when project managers invite you to collaborate on projects.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                disabled={settingsSaving}
                checked={settings.email_project_invites !== false}
                onChange={(e) => handleToggleSetting('email_project_invites', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Localization, Language & Display Currency Preferences Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Localization &amp; Regional Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Choose your preferred interface language and default display currency across your workshop.
              </p>
            </div>
          </div>

          {localizationSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Preferred Language */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Interface Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleUpdateLanguage(lang.code)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition gap-1',
                    currentLanguage === lang.code
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Currency */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Display Currency
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SUPPORTED_CURRENCIES.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => handleUpdateCurrency(curr)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition gap-1',
                    currentCurrency === curr
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  <span className="text-base">{CURRENCY_SYMBOLS[curr]}</span>
                  <span>{curr}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Support Workbench Development Card (Buy Me a Coffee) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                <Coffee className="w-4 h-4 fill-current" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Support Workbench Development
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Workbench is an independent, creator-first productivity platform built without paywalled core features. If Workbench helps you stay organized and level up your craft, consider buying us a coffee!
            </p>
          </div>

          <a
            href={process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL || 'https://buymeacoffee.com/orjustdosomething'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-amber-950 bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 shadow-md shadow-amber-400/20 transition transform hover:-translate-y-0.5 shrink-0"
          >
            <Coffee className="w-4 h-4 fill-current" />
            <span>Buy Me a Coffee &rarr;</span>
          </a>
        </div>
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
            Your export includes your complete profile data, unlocked skills &amp; XP progression, deliberate practice session logs, private workspace ideas &amp; notes, collaborative projects, assigned tasks, comments, inventory items &amp; folders, workshop formulas &amp; ingredients, and audit activity ledger.
          </p>
        </div>

        {restoreSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{restoreSuccess}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-400">Format: Standard JSON (v2.6.0)</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              <UploadCloud className="w-4 h-4 text-violet-500" />
              <span>Verify &amp; Restore Maker Archive</span>
            </button>

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
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModalOpen && archiveData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <UploadCloud className="w-5 h-5 text-violet-500" />
                <span>Verify &amp; Restore Maker Archive</span>
              </div>
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setArchiveData(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-2xl text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <div className="font-bold text-violet-900 dark:text-violet-300">
                Archive Schema Verified: v{archiveData.version || '1.6.0'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Workbench will safely restore and merge these records into your account. Existing records with matching names will not be duplicated.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <FolderTree className="w-5 h-5 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Folders</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {restoreStats.folders}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <Boxes className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Inventory Items</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {restoreStats.items}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Formulas / Recipes</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {restoreStats.recipes}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Workspace Notes</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {restoreStats.notes}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3 col-span-2 sm:col-span-1">
                <Clock className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Batch Run Logs</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {restoreStats.runs}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRestoreModalOpen(false);
                  setArchiveData(null);
                }}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={restoring}
                className="px-5 py-2 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring Ledger...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Restore Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
