"use client";

import { FeedIcon } from "@/src/lib/feed-icon";
import { formatDateTime } from "@/src/lib/date-utils";
import { sanitizeForDisplay } from "@/src/lib/html-utils";
import VoteButtons from "./VoteButtons";
import ShareButton from "./ShareButton";

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
  likes?: number;
  dislikes?: number;
  userVote?: "like" | "dislike" | null;
}

export default function FeedCard({
  id,
  title,
  url,
  summary,
  publishedAt,
  author,
  feed,
  likes = 0,
  dislikes = 0,
  userVote = null,
}: FeedCardProps) {
  return (
    <article 
      className="border-2 hover:shadow-[0_0_15px_var(--color-accent-primary)] transition-all duration-300 group h-full flex flex-col"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      <div className="p-3 sm:p-3.5 md:p-4 space-y-2 flex-1 flex flex-col">
        {/* Feed Badge */}
        {feed && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
            {feed.url && (
              <FeedIcon url={feed.url} size={12} className="flex-shrink-0" />
            )}
            <span 
              className="text-[8px] sm:text-[9px] md:text-[10px] font-orbitron uppercase tracking-wider px-1 sm:px-1.5 py-0.5 border rounded truncate max-w-full"
              style={{
                color: 'var(--color-accent-secondary)',
                borderColor: 'var(--color-accent-secondary)',
                textShadow: 'var(--shadow-glow)'
              }}
            >
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
            className="text-xs sm:text-sm md:text-base font-bold transition-all block line-clamp-2 sm:line-clamp-3"
            style={{ 
              color: 'var(--color-text-primary)',
              textShadow: 'var(--shadow-glow)'
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeForDisplay(title) }}
          />
        </h3>

        {/* Summary */}
        {summary && (
          <p 
            className="text-[10px] sm:text-[11px] md:text-xs line-clamp-2 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: sanitizeForDisplay(summary) }}
          />
        )}

        {/* Meta */}
        <div 
          className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] md:text-[10px] pt-1.5 border-t mt-auto"
          style={{ 
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)'
          }}
        >
          {author && (
            <span className="flex items-center gap-0.5 sm:gap-1 truncate max-w-[45%]">
              <span 
                className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-accent-secondary)' }}
              />
              <span className="truncate">{author}</span>
            </span>
          )}
          {publishedAt && (
            <time dateTime={publishedAt} className="flex items-center gap-0.5 sm:gap-1">
              <span 
                className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-accent-primary)' }}
              />
              <span className="truncate">{formatDateTime(publishedAt)}</span>
            </time>
          )}
        </div>

        {/* Interaction Buttons */}
        <div className="flex items-center flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <VoteButtons itemId={id} initialLikes={likes} initialDislikes={dislikes} initialUserVote={userVote} />
          <ShareButton itemId={id} title={title} url={url} />
        </div>
      </div>
    </article>
  );
}

