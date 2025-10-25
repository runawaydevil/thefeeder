import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchItems } from '../lib/api';

interface PrefetchOptions {
  currentPage: number;
  hasNextPage: boolean;
  params: {
    feed_id?: number;
    search?: string;
    sort?: string;
  };
}

export function usePrefetch({ currentPage, hasNextPage, params }: PrefetchOptions) {
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create intersection observer for footer
    const footer = document.querySelector('footer');
    if (!footer) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage) {
          // Prefetch next page
          const nextPage = currentPage + 1;
          queryClient.prefetchQuery({
            queryKey: ['items', nextPage, params.feed_id, params.search, params.sort],
            queryFn: () => fetchItems({ 
              page: nextPage, 
              feed_id: params.feed_id, 
              search: params.search, 
              sort: params.sort 
            }),
          });
        }
      },
      {
        // Trigger when 80% of footer is visible
        threshold: 0.8,
        rootMargin: '200px',
      }
    );

    observerRef.current.observe(footer);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [currentPage, hasNextPage, params, queryClient]);
}




