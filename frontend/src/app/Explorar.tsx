import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchFeeds } from '../lib/api';
import type { Feed } from '../types/api';
import SourceIcon from '../components/SourceIcon';

export default function Explorar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['feeds'],
    queryFn: () => fetchFeeds({ enabled_only: true }),
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading feeds...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">Error loading feeds.</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-fg mb-6">
        Explore Feeds
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.feeds?.map((feed: Feed) => (
          <div
            key={feed.id}
            className="bg-card rounded border border-border p-6 hover:shadow-card transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <SourceIcon url={feed.url} size={24} />
              <h2 className="text-lg font-semibold text-fg">
                {feed.name}
              </h2>
            </div>
            <p className="text-sm text-muted mb-4 break-all">
              {feed.url}
            </p>
            <Link
              to={`/feed/${feed.id}`}
              className="text-accent hover:text-accent-hover transition-colors text-sm"
            >
              View items →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

