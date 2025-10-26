import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchItems } from '../lib/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePrefetch } from '../hooks/usePrefetch';
import { toggleRead, isRead } from '../lib/preferences';
import { usePreferences } from '../contexts/PreferencesContext';
import { applyClientFilters, type ClientFilters } from '../lib/filters';
import { useToast } from '../components/Toast';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { ItemListSkeleton } from '../components/ItemSkeleton';
import EmptyState from '../components/EmptyState';
import VirtualizedItemList from '../components/VirtualizedItemList';
import SourceIcon from '../components/SourceIcon';
import { formatRelativeTime } from '../lib/format';
import { CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  const page = parseInt(searchParams.get('page') || '1');
  const feedId = searchParams.get('feed_id') ? parseInt(searchParams.get('feed_id')!) : undefined;
  const search = searchParams.get('search') || undefined;
  const sort = searchParams.get('sort') || 'recent';

  const { data, isLoading, error } = useQuery({
    queryKey: ['items', page, feedId, search, sort],
    queryFn: () => fetchItems({ page, feed_id: feedId, search, sort }),
  });

  const prefs = usePreferences();
  const { showToast } = useToast();

  // Client-side filters
  const [filters] = useState<ClientFilters>({
    showUnreadOnly: false,
    mutedKeywords: prefs.mutedKeywords,
    blockedDomains: prefs.blockedDomains,
    videoOnly: false,
    feedId: feedId,
  });

  const allItems = data?.items || [];
  const filteredItems = applyClientFilters(allItems, filters);

  // Prefetch next page when near bottom
  usePrefetch({
    currentPage: page,
    hasNextPage: data?.pagination?.has_next || false,
    params: {
      feed_id: feedId,
      search: search,
      sort: sort,
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNavigateNext: () => {
      if (selectedIndex < filteredItems.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
    },
    onNavigatePrev: () => {
      if (selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    },
    onOpen: () => {
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        window.open(selectedItem.link, '_blank', 'noopener,noreferrer');
      }
    },
    onToggleRead: () => {
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        const isNowRead = toggleRead(selectedItem.id);
        showToast(
          isNowRead ? 'Marked as read' : 'Marked as unread',
          isNowRead ? 'success' : 'info'
        );
      }
    },
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    onGoHome: () => {
      navigate('/');
    },
    onShowHelp: () => {
      setShowHelp(true);
    },
    onEscape: () => {
      setShowHelp(false);
      setSelectedIndex(0);
    },
  });

  if (isLoading) {
    return <ItemListSkeleton count={5} />;
  }

  if (error) {
    return (
      <EmptyState
        type="error"
        message="Unable to load articles."
        action={{
          label: 'Try again',
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  if (!data || filteredItems.length === 0) {
    return (
      <EmptyState
        type="no-items"
        message={filters.showUnreadOnly ? 'No unread articles.' : 'No articles found.'}
        action={
          !filteredItems.length
            ? {
                label: 'Explore feeds',
                onClick: () => navigate('/explore'),
              }
            : undefined
        }
      />
    );
  }

  // Use virtualized list for better performance with many items
  const useVirtualization = filteredItems.length > 30;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Timeline</h1>
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1 text-sm text-muted hover:text-fg border border-border rounded hover:bg-card transition-colors"
          >
            ? Shortcuts
          </button>
        </div>

        {useVirtualization ? (
          <div style={{ height: 'calc(100vh - 200px)' }}>
            <VirtualizedItemList
              items={filteredItems}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          </div>
        ) : (
          <>
            {filteredItems.map((item: any, index: number) => {
          const isSelected = index === selectedIndex;
          const itemIsRead = isRead(item.id);
          
          return (
            <div
              key={item.id}
              className={`bg-card rounded border border-border p-6 transition-all cursor-pointer hover:shadow-lg ${
                isSelected ? 'ring-2 ring-accent' : ''
              } ${itemIsRead ? 'opacity-60' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="shrink-0 mt-1">
                  <SourceIcon url={item.link} size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <h2 className="text-xl font-semibold flex-1">
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-accent transition-colors"
                      >
                        {item.title}
                      </a>
                    </h2>
                    {itemIsRead && (
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {item.summary && (
                <p className="text-muted mb-3 line-clamp-2">{item.summary}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted">
                <span>{item.feed_name || 'Feed'}</span>
                {item.published && (
                  <span>{formatRelativeTime(item.published)}</span>
                )}
              </div>
            </div>
          );
        })}
          </>
        )}
      </div>

      <KeyboardShortcutsHelp 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
      />
    </>
  );
}