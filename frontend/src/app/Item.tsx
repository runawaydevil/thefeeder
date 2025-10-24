import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchItem } from '../lib/api';
import SourceIcon from '../components/SourceIcon';

export default function Item() {
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id) : 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => fetchItem(itemId),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-fg">Loading...</div>;
  }

  if (error || !data) {
    return <div className="text-center py-12 text-error">Item not found.</div>;
  }

  return (
    <article className="bg-card rounded border border-border p-8">
      <h1 className="text-3xl font-bold text-fg mb-4">
        {data.title}
      </h1>
      
      <div className="flex items-center gap-3 text-sm text-muted mb-6">
        <SourceIcon url={data.link} size={20} />
        <span>{data.feed_name || 'Feed'}</span>
        {data.published && (
          <span>• {new Date(data.published).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          })}</span>
        )}
        {data.author && <span>• {data.author}</span>}
      </div>

      {data.summary && (
        <div
          className="prose prose-slate max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: data.summary }}
        />
      )}

      <div className="mt-8">
        <a
          href={data.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
        >
          Open on original site →
        </a>
      </div>
    </article>
  );
}

