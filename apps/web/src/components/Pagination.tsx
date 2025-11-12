"use client";

import { useRouter } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage }: PaginationProps) {
  const router = useRouter();
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const goToPage = (page: number) => {
    const urlParams = new URLSearchParams();
    if (page > 1) {
      urlParams.set("page", page.toString());
    }
    const newUrl = urlParams.toString() ? `/?${urlParams.toString()}` : "/";
    router.push(newUrl);
  };

  const handlePrevious = () => {
    if (!isFirstPage) {
      goToPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      goToPage(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 px-3 sm:px-4">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={isFirstPage}
          className="px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all uppercase tracking-wider font-bold border-2"
          style={{
            background: isFirstPage ? 'var(--color-bg-secondary)' : 'var(--color-accent-secondary)',
            color: isFirstPage ? 'var(--color-text-secondary)' : 'var(--color-bg-primary)',
            borderColor: isFirstPage ? 'var(--color-border)' : 'var(--color-accent-secondary)',
            opacity: isFirstPage ? 0.5 : 1,
            cursor: isFirstPage ? 'not-allowed' : 'pointer'
          }}
        >
          ← Previous
        </button>

        {/* Page Info */}
        <div 
          className="px-4 py-1.5 text-xs sm:text-sm uppercase tracking-wider font-bold border-2 rounded-md backdrop-blur-md"
          style={{
            color: 'var(--color-accent-secondary)',
            textShadow: 'var(--shadow-glow)',
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-secondary)'
          }}
        >
          Page {currentPage} of {totalPages}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={isLastPage}
          className="px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all uppercase tracking-wider font-bold border-2"
          style={{
            background: isLastPage ? 'var(--color-bg-secondary)' : 'var(--color-accent-primary)',
            color: isLastPage ? 'var(--color-text-secondary)' : 'var(--color-bg-primary)',
            borderColor: isLastPage ? 'var(--color-border)' : 'var(--color-accent-primary)',
            opacity: isLastPage ? 0.5 : 1,
            cursor: isLastPage ? 'not-allowed' : 'pointer'
          }}
        >
          Next →
        </button>
      </div>

      {/* Items Info */}
      <p 
        className="text-[10px] sm:text-xs text-center"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} articles
      </p>
    </div>
  );
}

