import FeedList from "@/src/components/FeedList";
import SubscribeForm from "@/src/components/SubscribeForm";
import Pagination from "@/src/components/Pagination";
import StarsEffect from "@/src/components/StarsEffect";
import { ThemeToggle } from "@/src/components/ThemeToggle";
import { getItems, getStats } from "@/src/lib/server-data";
import type { Metadata } from "next";
import { getAbsoluteUrl, getDefaultOgImage, truncateMetaText } from "@/src/lib/seo-utils";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

// Generate dynamic metadata based on recent articles and stats
export async function generateMetadata(): Promise<Metadata> {
  const [{ items }, stats] = await Promise.all([
    getItems(1, 0), // Get only the first (most recent) article
    getStats(),
  ]);

  const firstArticle = items[0];
  const siteUrl = getAbsoluteUrl("/");
  
  // Dynamic title with stats
  const title = stats.items > 0 && stats.feeds > 0
    ? `TheFeeder - ${stats.items} Articles from ${stats.feeds} Feeds`
    : "TheFeeder - Modern RSS Aggregator";

  // Dynamic description based on first article or generic
  // Always use TheFeeder logo for social sharing
  let description: string;

  if (firstArticle) {
    // Use first article's summary or title for description
    description = firstArticle.summary
      ? truncateMetaText(firstArticle.summary, 160)
      : `Latest: ${firstArticle.title}. Stay updated with ${stats.items} articles from ${stats.feeds} feeds.`;
  } else {
    description = `Modern RSS feed reader and daily digest aggregator. ${stats.items > 0 ? `Currently aggregating ${stats.items} articles from ${stats.feeds} feeds.` : "Start aggregating your favorite RSS feeds today."}`;
  }

  // Always use TheFeeder logo for social sharing
  const ogImage = getDefaultOgImage();

  return {
    title,
    description,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "TheFeeder",
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: "TheFeeder - Modern RSS Aggregator",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Get page number from URL query (default to page 1)
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const itemsPerPage = 20;
  const skip = (currentPage - 1) * itemsPerPage;

  // Use server-side data fetching directly (no HTTP fetch needed during SSR)
  const [{ items, total }, stats] = await Promise.all([
    getItems(itemsPerPage, skip),
    getStats(),
  ]);

  return (
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines" style={{ background: 'var(--color-bg-primary)', transition: 'var(--theme-transition)' }}>
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'var(--gradient-bg-overlay)',
        transition: 'var(--theme-transition)'
      }} />

      {/* Stars/Particles Effect - Client-side only to avoid hydration errors */}
      <StarsEffect />

      <header className="relative z-10 pt-6 md:pt-8 pb-4 md:pb-6 flex flex-col items-center gap-3 md:gap-4" style={{ transition: 'var(--theme-transition)' }}>
        <div className="glow-soft">
          <img src="/logo.png" alt="The Feeder Logo" className="w-16 h-16 md:w-20 md:h-20" />
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold neon-glow-pink leading-tight" style={{ color: 'var(--color-accent-primary)', fontFamily: 'var(--font-heading)', textShadow: 'var(--shadow-glow-strong)' }}>
          THE FEEDER
        </h1>
      </header>

      {/* Decorative Elements */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 opacity-40 rounded-lg rotate-45 z-0" style={{ borderColor: 'var(--color-accent-primary)', boxShadow: 'var(--shadow-glow)', transition: 'var(--theme-transition)' }} />
      <div className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 border-2 md:border-4 opacity-40 rounded-full z-0" style={{ borderColor: 'var(--color-accent-secondary)', boxShadow: 'var(--shadow-glow)', transition: 'var(--theme-transition)' }} />

      {/* Feed List */}
      <div className="relative z-10 mt-3 sm:mt-4 md:mt-6">
        <FeedList items={items} />
      </div>

      {/* Pagination */}
      {total > itemsPerPage && (
        <div className="relative z-10 mt-6 mb-4">
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Subscribe Form */}
      <div className="relative z-10 px-3 sm:px-4 pb-16 sm:pb-20 md:pb-24 mt-3 sm:mt-4 md:mt-6">
        <div className="max-w-lg mx-auto">
          <SubscribeForm />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-1 md:p-1.5 md:p-2 backdrop-blur-md z-20" style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', transition: 'var(--theme-transition)' }}>
        <div className="flex justify-between items-center text-[8px] sm:text-[9px] md:text-[10px] max-w-7xl mx-auto px-2" style={{ color: 'var(--color-text-secondary)', transition: 'var(--theme-transition)' }}>
          <span className="flex items-center gap-1 md:gap-1.5">
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-accent-primary)', boxShadow: 'var(--shadow-glow)' }} />
            <span className="hidden sm:inline">FEEDS: {stats.feeds} | ARTICLES: {stats.items}</span>
            <span className="sm:hidden">{stats.feeds}|{stats.items}</span>
          </span>
          <span className="hidden md:inline text-[8px] sm:text-[9px]">
            developed by{" "}
            <a 
              href="https://github.com/runawaydevil" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline transition-colors"
              style={{ color: 'var(--color-accent-secondary)' }}
            >
              runawaydevil
            </a>
            {" "}- {new Date().getFullYear()}
          </span>
          <span className="flex items-center gap-1 md:gap-1.5">
            <ThemeToggle />
          </span>
        </div>
      </div>
    </div>
  );
}
