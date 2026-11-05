'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  className?: string;
  alt?: string;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-9 h-9 text-sm',
  xl: 'w-10 h-10 text-sm',
  '2xl': 'w-20 h-20 text-2xl font-black',
};

const SHAPE_CLASSES = {
  circle: 'rounded-full',
  'rounded-xl': 'rounded-xl',
  'rounded-2xl': 'rounded-2xl',
  'rounded-3xl': 'rounded-3xl',
};

export default function UserAvatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  className,
  alt,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if image src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initial = (name?.trim()?.charAt(0) || 'M').toUpperCase();
  const shapeClass = SHAPE_CLASSES[shape] || 'rounded-full';
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const hasValidImage = Boolean(src && src.trim() && !imgError);

  if (hasValidImage) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-slate-200/50 dark:ring-slate-700/50',
          sizeClass,
          shapeClass,
          className
        )}
      >
        <img
          src={src!}
          alt={alt || name || 'User avatar'}
          className={cn('w-full h-full object-cover', shapeClass)}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center select-none shadow-sm',
        sizeClass,
        shapeClass,
        className
      )}
      title={name || undefined}
    >
      <span>{initial}</span>
    </div>
  );
}
