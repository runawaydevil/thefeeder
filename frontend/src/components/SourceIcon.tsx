import { resolveSourceIcon, faviconUrl, getInitials } from '../lib/icon-source';
import { Rss } from 'lucide-react';

interface SourceIconProps {
  url: string;
  size?: number;
  className?: string;
}

export default function SourceIcon({ url, size = 24, className = '' }: SourceIconProps) {
  const icon = resolveSourceIcon(url);

  // Social media icon
  if (icon.type === 'social') {
    return (
      <img
        src={`https://cdn.simpleicons.org/${icon.name}`}
        alt={icon.name}
        width={size}
        height={size}
        className={`opacity-90 ${className}`}
        loading="eager"
        decoding="async"
        aria-hidden="true"
      />
    );
  }

  // RSS icon for generic feeds
  if (icon.type === 'rss') {
    return (
      <Rss 
        width={size} 
        height={size} 
        className={`text-accent ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Favicon fallback
  if (icon.type === 'favicon') {
    return (
      <img 
        src={faviconUrl(url, size)} 
        width={size} 
        height={size} 
        alt=""
        className={className}
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
    );
  }

  // Initials fallback
  const initials = getInitials(url);
  return (
    <div
      className={`grid place-items-center rounded-md ${className}`}
      style={{ 
        width: size, 
        height: size, 
        background: 'hsl(var(--meta-bg))', 
        color: 'hsl(var(--fg))',
        fontSize: `${size * 0.4}px`
      }}
      aria-hidden="true"
    >
      <span className="font-semibold">{initials}</span>
    </div>
  );
}

