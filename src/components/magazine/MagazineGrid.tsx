import ArticleCard from "./ArticleCard";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Clock, Database } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useState } from "react";



const MagazineGrid = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { 
    articles, 
    isLoading, 
    error, 
    totalPages, 
    totalArticles, 
    syncStatus, 
    refresh, 
    formatTimeUntilNextSync 
  } = useNewsFeed(currentPage, 12);

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="hero-title text-4xl mb-4 text-gray-800 dark:text-gray-100">The Feed</h2>
            <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto">
              Loading RSS feed content...
            </p>
          </div>
          
          <div className="grid gap-8 md:gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rss-card-bg rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-muted"></div>
                <div className="p-6">
                  <div className="h-6 bg-muted rounded mb-3"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-muted rounded mb-4 w-1/2"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-muted rounded w-20"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="hero-title text-4xl mb-4 text-gray-800 dark:text-gray-100">The Feed</h2>
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto">
                {error}
              </p>
              <Button onClick={refresh} variant="outline" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">The Feed</h2>

          
          {/* Sync status */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
              <Database className="h-4 w-4 text-orange-500" />
              <span>{totalArticles} articles</span>
            </div>
            
            {syncStatus.lastSyncTime > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="hidden sm:inline">Next sync in </span>
                <span className="sm:hidden">Sync: </span>
                <span>{formatTimeUntilNextSync(syncStatus.timeUntilNextSync)}</span>
              </div>
            )}
            

          </div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="rss-card-bg rounded-2xl p-8 sm:p-12 max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <svg className="h-8 w-8 text-orange-500 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.082v4.15c6.988 0 12.65 5.662 12.65 12.65h4.15c0-9.271-7.529-16.8-16.8-16.8zM1.677.014v4.151C14.236 4.165 24.322 14.251 24.336 26.81H28.487C28.473 12.32 16.168.009 1.677.014z"/>
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Waiting for RSS feed synchronization...
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                Articles will appear here soon
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  excerpt={article.excerpt}
                  author={article.author}
                  publishedDate={article.publishedDate}
                  readingTime={article.readingTime}
                  imageUrl={article.imageUrl}
                  category={article.category}
                  href={article.href}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {/* Pages */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default MagazineGrid;