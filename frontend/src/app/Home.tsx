import { useQuery } from '@tanstack/react-query';
import { fetchItems } from '../lib/api';
import { useSearchParams } from 'react-router-dom';
import SourceIcon from '../components/SourceIcon';

export default function Home() {
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const feedId = searchParams.get('feed_id') ? parseInt(searchParams.get('feed_id')!) : undefined;
  const search = searchParams.get('search') || undefined;
  const sort = searchParams.get('sort') || 'recent';

  const { data, isLoading, error } = useQuery({
    queryKey: ['items', page, feedId, search, sort],
    queryFn: () => fetchItems({ page, feed_id: feedId, search, sort }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded border border-border p-6 animate-pulse">
            <div className="h-4 bg-border rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-border rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Error loading items.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-accent text-accent-fg rounded hover:bg-accent-hover transition-colors">
          Try again
        </button>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted mb-4">No items found.</p>
        <a href="/explore" className="text-accent hover:text-accent-hover transition-colors">
          Explore popular feeds
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-fg mb-6">
        Timeline
      </h1>
      
      {data.items.map((item: any) => (
        <div
          key={item.id}
          className="bg-card rounded border border-border p-6 hover:shadow-card transition-shadow"
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="shrink-0 mt-1">
              <SourceIcon url={item.link} size={28} />
            </div>
            <h2 className="text-xl font-semibold text-fg flex-1">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                {item.title}
              </a>
            </h2>
          </div>
          
          {item.summary && (
            <p className="text-muted mb-3 line-clamp-2">
              {item.summary}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted">
            <span>{item.feed_name || 'Feed'}</span>
            {item.published && (
              <span>• {new Date(item.published).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              })}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

