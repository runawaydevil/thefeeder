/**
 * Resolve source icon type based on URL domain
 */

const SOCIAL_MAP: Record<string, string> = {
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'x.com': 'twitter',
  'twitter.com': 'twitter',
  'instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'linkedin.com': 'linkedin',
  'tiktok.com': 'tiktok',
  'reddit.com': 'reddit',
  'medium.com': 'medium',
  'substack.com': 'substack',
  'spotify.com': 'spotify',
  'podcasts.apple.com': 'applepodcasts',
  'github.com': 'github',
  'stackoverflow.com': 'stackoverflow',
};

export type SourceIcon =
  | { type: 'social'; name: string }
  | { type: 'rss' }
  | { type: 'favicon'; url: string }
  | { type: 'initials'; text: string };

/**
 * Resolve icon type based on source URL
 */
export function resolveSourceIcon(sourceUrl: string): SourceIcon {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '');
    
    // Check if it's a known social media domain
    const socialKey = Object.keys(SOCIAL_MAP).find(k => host.endsWith(k));
    if (socialKey) {
      return { type: 'social', name: SOCIAL_MAP[socialKey] };
    }
    
    // For non-social domains, use RSS icon
    return { type: 'rss' };
  } catch {
    // Fallback to initials
    return { type: 'initials', text: '?' };
  }
}

/**
 * Get favicon URL from Google's favicon service
 */
export function faviconUrl(hostname: string, size: number = 64): string {
  try {
    const host = hostname.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${host}&sz=${size}`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  }
}

/**
 * Get initials from hostname
 */
export function getInitials(hostname: string): string {
  try {
    const host = new URL(hostname).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    const firstPart = parts[0] || '';
    return firstPart.slice(0, 2).toUpperCase();
  } catch {
    return '??';
  }
}

