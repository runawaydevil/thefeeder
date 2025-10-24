/**
 * API client with TanStack Query.
 */

import { QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, Item, Feed, FeedWithStats } from '../types/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const API_BASE = import.meta.env.VITE_API_URL || '';

interface FetchItemsParams {
  page?: number;
  limit?: number;
  feed_id?: number;
  search?: string;
  sort?: string;
}

interface FetchFeedsParams {
  search?: string;
  enabled_only?: boolean;
}

export async function fetchItems(params: FetchItemsParams = {}): Promise<PaginatedResponse<Item>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.feed_id) searchParams.set('feed_id', params.feed_id.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.sort) searchParams.set('sort', params.sort);
  
  const response = await fetch(`${API_BASE}/api/items?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
}

export async function fetchItem(id: number): Promise<Item> {
  const response = await fetch(`${API_BASE}/api/items/${id}`);
  if (!response.ok) throw new Error('Failed to fetch item');
  return response.json();
}

export async function fetchFeeds(params: FetchFeedsParams = {}): Promise<{ feeds: Feed[], pagination: any }> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set('search', params.search);
  if (params.enabled_only !== undefined) searchParams.set('enabled_only', params.enabled_only.toString());
  
  const response = await fetch(`${API_BASE}/api/feeds?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch feeds');
  return response.json();
}

export async function fetchFeed(id: number): Promise<FeedWithStats> {
  const response = await fetch(`${API_BASE}/api/feeds/${id}`);
  if (!response.ok) throw new Error('Failed to fetch feed');
  return response.json();
}

export async function fetchFeedItems(
  feedId: number,
  params: FetchItemsParams = {}
): Promise<PaginatedResponse<Item>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.sort) searchParams.set('sort', params.sort);
  
  const response = await fetch(`${API_BASE}/api/feeds/${feedId}/items?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch feed items');
  return response.json();
}

