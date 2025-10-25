import type { Item } from '../types/api';
import { isRead } from './preferences';

export interface ClientFilters {
  showUnreadOnly: boolean;
  mutedKeywords: string[];
  blockedDomains: string[];
  videoOnly: boolean;
  feedId?: number;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function isVideo(url: string): boolean {
  const domain = extractDomain(url);
  return domain.includes('youtube.com') || 
         domain.includes('vimeo.com') || 
         domain.includes('twitch.tv') ||
         url.includes('/watch?v=');
}

export function applyClientFilters(items: Item[], filters: ClientFilters): Item[] {
  return items.filter(item => {
    // Filter by read status
    if (filters.showUnreadOnly && isRead(item.id)) {
      return false;
    }

    // Filter by muted keywords
    if (filters.mutedKeywords.length > 0) {
      const titleLower = item.title.toLowerCase();
      const summaryLower = (item.summary || '').toLowerCase();
      const hasMutedKeyword = filters.mutedKeywords.some(
        keyword => titleLower.includes(keyword.toLowerCase()) || 
                  summaryLower.includes(keyword.toLowerCase())
      );
      if (hasMutedKeyword) return false;
    }

    // Filter by blocked domains
    if (filters.blockedDomains.length > 0) {
      const domain = extractDomain(item.link);
      const isBlocked = filters.blockedDomains.some(
        blocked => domain.includes(blocked) || domain.includes(`.${blocked}`)
      );
      if (isBlocked) return false;
    }

    // Filter by video-only
    if (filters.videoOnly && !isVideo(item.link)) {
      return false;
    }

    // Filter by feed
    if (filters.feedId && item.feed_id !== filters.feedId) {
      return false;
    }

    return true;
  });
}

export function getFilterCount(items: Item[], filters: ClientFilters): number {
  return applyClientFilters(items, filters).length;
}




