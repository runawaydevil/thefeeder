import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect } from 'react';
import type { Item } from '../types/api';
import SourceIcon from './SourceIcon';
import { formatRelativeTime } from '../lib/format';
import { isRead } from '../lib/preferences';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  items: Item[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function VirtualizedItemList({ items, selectedIndex, onSelect }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Approximate height of each card
    overscan: 5,
  });

  // Scroll to selected item
  useEffect(() => {
    const totalSize = virtualizer.getTotalSize();
    if (selectedIndex >= 0 && totalSize > 0) {
      virtualizer.scrollToIndex(selectedIndex, {
        align: 'auto',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, virtualizer]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const itemIsRead = isRead(item.id);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`bg-card rounded border border-border p-6 transition-all cursor-pointer hover:shadow-lg ${
                  virtualRow.index === selectedIndex ? 'ring-2 ring-accent' : ''
                } ${itemIsRead ? 'opacity-60' : ''}`}
                onClick={() => onSelect(virtualRow.index)}
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
                  {item.published && <span>{formatRelativeTime(item.published)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




