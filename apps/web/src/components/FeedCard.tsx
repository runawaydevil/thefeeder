"use client";

import { FeedIcon } from "@/src/lib/feed-icon";

interface FeedCardProps {
  id: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  author?: string;
  feed?: {
    title: string;
    url?: string;
  };
}

export default function FeedCard({
  title,
  url,
  summary,
  publishedAt,
  author,
  feed,
}: FeedCardProps) {
  return (
    <article className="cyber-card border-2 border-vaporwave-pink/50 hover:border-vaporwave-pink hover:shadow-[0_0_15px_hsl(320_100%_65%_/_0.4)] transition-all duration-300 group h-full flex flex-col">
      <div className="p-3 sm:p-3.5 md:p-4 space-y-2 flex-1 flex flex-col">
        {/* Feed Badge */}
        {feed && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
            {feed.url && (
              <FeedIcon url={feed.url} size={12} className="flex-shrink-0" />
            )}
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-vaporwave-cyan neon-glow-cyan font-orbitron uppercase tracking-wider px-1 sm:px-1.5 py-0.5 border border-vaporwave-cyan/50 rounded truncate max-w-full">
              {feed.title}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="group-hover:text-white transition-colors flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm md:text-base font-bold text-white hover:text-vaporwave-cyan transition-all block line-clamp-2 sm:line-clamp-3"
            style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3), 0 0 12px rgba(0, 255, 255, 0.2)' }}
          >
            {title}
          </a>
        </h3>

        {/* Summary */}
        {summary && (
          <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] md:text-[10px] text-vaporwave-cyan/70 pt-1.5 border-t border-vaporwave-cyan/20 mt-auto">
          {author && (
            <span className="flex items-center gap-0.5 sm:gap-1 truncate max-w-[45%]">
              <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-vaporwave-cyan rounded-full flex-shrink-0" />
              <span className="truncate">{author}</span>
            </span>
          )}
          {publishedAt && (
            <time dateTime={publishedAt} className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-vaporwave-purple rounded-full flex-shrink-0" />
              <span className="truncate">{new Date(publishedAt).toLocaleDateString()}</span>
            </time>
          )}
        </div>
      </div>
    </article>
  );
}

