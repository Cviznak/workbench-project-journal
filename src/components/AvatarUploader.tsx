'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cropAndCompressAvatar } from '@/lib/imageUtils';
import UserAvatar from '@/components/UserAvatar';
import { Camera, Trash2, Loader2, Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvatarUploaderProps {
  userId: string;
  username: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (newUrl: string | null) => void;
  size?: 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded-3xl';
  showControls?: boolean;
  className?: string;
}

export default function AvatarUploader({
  userId,
  username,
  currentAvatarUrl,
  onAvatarUpdated,
  size = '2xl',
  shape = 'rounded-3xl',
  showControls = true,
  className,
}: AvatarUploaderProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function triggerFilePicker() {
    if (uploading || removing) return;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Center-crop to 1:1 and compress to 256x256 WebP (<35KB)
      const webpBlob = await cropAndCompressAvatar(file, 256, 0.85);

      // 2. Storage path: ${userId}/avatar_${Date.now()}.webp in community-media bucket
      const fileName = `avatar_${Date.now()}.webp`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(filePath, webpBlob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('community-media')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 4. Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 5. Notify parent callback
      onAvatarUpdated(publicUrl);
      setSuccessMsg('Avatar updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setErrorMsg(err.message || 'Failed to upload avatar');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!currentAvatarUrl) return;
    if (!confirm('Remove your profile photo?')) return;

    setRemoving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      onAvatarUpdated(null);
      setSuccessMsg('Photo removed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Avatar removal error:', err);
      setErrorMsg(err.message || 'Failed to remove photo');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-4">
        {/* Clickable Avatar Circle / Square */}
        <div
          onClick={triggerFilePicker}
          className="relative group cursor-pointer shrink-0"
          title="Click to change profile picture"
        >
          <UserAvatar
            src={currentAvatarUrl}
            name={username}
            size={size}
            shape={shape}
            className="border-4 border-white dark:border-slate-900 shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
          />

          {/* Hover / Loading Overlay */}
          <div
            className={cn(
              'absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center text-white transition-opacity',
              shape === 'circle' ? 'rounded-full' : 'rounded-3xl',
              uploading || removing
                ? 'opacity-100 cursor-wait'
                : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : removing ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <>
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold tracking-tight">Change</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons & Status Feedback */}
        {showControls && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={triggerFilePicker}
                disabled={uploading || removing}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{uploading ? 'Processing...' : 'Upload Photo'}</span>
              </button>

              {currentAvatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading || removing}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {removing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Remove</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Auto-cropped to 1:1 square &amp; compressed to WebP (&lt;35KB).
            </p>

            {successMsg && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
