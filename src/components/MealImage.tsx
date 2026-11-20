import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

interface MealImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function MealImage({ src, alt, className = '' }: MealImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-orange-50 text-emerald-800/70 p-4 ${className}`}
        aria-label={alt}
      >
        <Utensils className="w-8 h-8 mb-2 text-emerald-700/60" />
        <span className="text-xs font-medium text-center text-slate-600 line-clamp-2 max-w-[180px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
