/**
 * TypeScript interfaces matching Python models.
 */

export interface Feed {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  interval_seconds: number;
  last_fetch_status: string;
  last_fetch_time: string | null;
  consecutive_errors: number;
  degraded: boolean;
  created_at?: string;
}

export interface Item {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  published: string | null;
  author: string;
  summary: string;
  thumbnail: string;
  guid: string;
  is_new: boolean;
  feed_name?: string;
  feed_url?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
  meta?: {
    total: number;
  };
}

export interface FeedWithStats extends Feed {
  stats?: {
    total_items: number;
    last_item_time: string | null;
  };
}

