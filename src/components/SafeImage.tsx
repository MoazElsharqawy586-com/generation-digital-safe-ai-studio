import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-slate-200 p-4 text-center ${className}`}
        role="img"
        aria-label={alt || fallbackTitle || 'صورة المبادرة'}
      >
        <ShieldCheck className="w-8 h-8 text-cyan-400 mb-2 opacity-80" />
        {fallbackTitle && <span className="text-xs font-medium text-slate-300 line-clamp-2">{fallbackTitle}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
};
