import FeedList from "@/src/components/FeedList";
import SubscribeForm from "@/src/components/SubscribeForm";
import Pagination from "@/src/components/Pagination";
import StarsEffect from "@/src/components/StarsEffect";
import { getItems, getStats } from "@/src/lib/server-data";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
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
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines">
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 50% 0%, hsl(320 100% 50% / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, hsl(270 100% 50% / 0.3), transparent 50%)'
      }} />

      {/* Stars/Particles Effect - Client-side only to avoid hydration errors */}
      <StarsEffect />

      <header className="relative z-10 pt-6 md:pt-8 pb-4 md:pb-6 flex flex-col items-center gap-3 md:gap-4">
        <div className="glow-soft">
          <img src="/logo.png" alt="The Feeder Logo" className="w-16 h-16 md:w-20 md:h-20" />
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-primary neon-glow-pink leading-tight">
          THE FEEDER
        </h1>
      </header>

      {/* Decorative Elements */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-vaporwave-pink opacity-40 rounded-lg rotate-45 z-0" style={{ boxShadow: '0 0 15px hsl(320 100% 65%)' }} />
      <div className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 border-2 md:border-4 border-vaporwave-cyan opacity-40 rounded-full z-0" style={{ boxShadow: '0 0 15px hsl(180 100% 60%)' }} />

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
      <div className="absolute bottom-0 left-0 right-0 p-1 md:p-1.5 md:p-2 backdrop-blur-md z-20">
        <div className="flex justify-between items-center text-[8px] sm:text-[9px] md:text-[10px] text-vaporwave-cyan/70 max-w-7xl mx-auto px-2">
          <span className="flex items-center gap-1 md:gap-1.5">
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-vaporwave-pink rounded-full animate-pulse" style={{ boxShadow: '0 0 6px hsl(320 100% 65%)' }} />
            <span className="hidden sm:inline">FEEDS: {stats.feeds} | ARTICLES: {stats.items}</span>
            <span className="sm:hidden">{stats.feeds}|{stats.items}</span>
          </span>
          <span className="hidden md:inline text-[8px] sm:text-[9px]">
            developed by{" "}
            <a 
              href="https://github.com/runawaydevil" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-vaporwave-cyan hover:text-vaporwave-cyan hover:underline transition-colors"
            >
              runawaydevil
            </a>
            {" "}- 2026
          </span>
          <span className="flex items-center gap-1 md:gap-1.5">
            <span className="hidden sm:inline">READY</span>
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-vaporwave-cyan rounded-full animate-pulse" style={{ boxShadow: '0 0 6px hsl(180 100% 60%)' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
