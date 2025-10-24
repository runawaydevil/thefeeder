/**
 * Map domain to icon (Simple Icons or Lucide).
 */

export interface IconInfo {
  type: 'simple' | 'lucide';
  name: string;
}

export function iconForSource(url: string): IconInfo {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    
    const domainMap: Record<string, string> = {
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
    
    const match = Object.keys(domainMap).find(k => hostname.includes(k));
    
    if (match) {
      return { type: 'simple', name: domainMap[match] };
    }
    
    return { type: 'lucide', name: 'rss' };
  } catch {
    return { type: 'lucide', name: 'rss' };
  }
}

export function getFaviconUrl(domain: string, size: number = 32): string {
  try {
    const hostname = new URL(domain).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  }
}

