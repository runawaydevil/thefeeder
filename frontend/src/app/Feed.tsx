import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchFeed, fetchFeedItems } from '../lib/api';
import SourceIcon from '../components/SourceIcon';

export default function Feed() {
  const { id } = useParams<{ id: string }>();
  const feedId = id ? parseInt(id) : 0;

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['feed', feedId],
    queryFn: () => fetchFeed(feedId),
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['feed-items', feedId],
    queryFn: () => fetchFeedItems(feedId),
  });

  if (feedLoading || itemsLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!feedData) {
    return <div className="text-center py-12 text-red-600">Feed not found.</div>;
  }

  return (
    <div>
      <div className="bg-card rounded border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <SourceIcon url={feedData.url} size={32} />
          <h1 className="text-3xl font-bold text-fg">
            {feedData.name}
          </h1>
        </div>
        <p className="text-muted break-all mb-4">{feedData.url}</p>
        {feedData.stats && (
          <p className="text-sm text-muted">
            {feedData.stats.total_items} items
          </p>
        )}
      </div>

      <div className="space-y-4">
        {itemsData?.items.map((item: any) => (
          <div
            key={item.id}
            className="bg-card rounded border border-border p-6 hover:shadow-card transition-shadow"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="shrink-0 mt-1">
                <SourceIcon url={item.link} size={24} />
              </div>
              <h2 className="text-xl font-semibold text-fg flex-1">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  {item.title}
                </a>
              </h2>
            </div>
            {item.summary && (
              <p className="text-muted mb-3">{item.summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

