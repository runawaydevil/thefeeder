"use client";

import FeedCard from "@/src/components/FeedCard";

interface Item {
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

interface FeedListProps {
  items: Item[];
  loading?: boolean;
}

export default function FeedList({ items, loading }: FeedListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 px-3 sm:px-4 md:px-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="cyber-card border-2 border-vaporwave-cyan/30 p-3 sm:p-3.5 md:p-4 animate-pulse"
          >
            <div className="h-2.5 sm:h-3 bg-vaporwave-pink/20 rounded w-14 sm:w-16 mb-1.5 sm:mb-2" />
            <div className="h-4 sm:h-5 bg-vaporwave-pink/20 rounded w-full mb-1.5 sm:mb-2" />
            <div className="h-2.5 sm:h-3 bg-vaporwave-cyan/20 rounded w-3/4 mb-1 sm:mb-1.5" />
            <div className="h-2.5 sm:h-3 bg-vaporwave-cyan/20 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 px-3 sm:px-4">
        <div className="p-3 sm:p-4 md:p-6 max-w-md mx-auto">
          <p className="text-xs sm:text-sm md:text-base font-bold text-primary neon-glow-pink mb-1.5 sm:mb-2 uppercase tracking-wider">
            NO FEEDS YET
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 px-3 sm:px-4 md:px-6 pb-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xs sm:text-sm md:text-base font-bold text-vaporwave-cyan neon-glow-cyan mb-3 sm:mb-4 md:mb-5 text-center uppercase tracking-wider">
          Latest Articles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item) => (
            <FeedCard key={item.id} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
