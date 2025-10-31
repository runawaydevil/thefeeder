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
          className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all uppercase tracking-wider font-bold border-2 ${
            isFirstPage
              ? "bg-card/30 text-muted-foreground border-vaporwave-cyan/20 cursor-not-allowed opacity-50"
              : "bg-vaporwave-cyan text-primary-foreground border-vaporwave-cyan hover:bg-vaporwave-cyan/90 hover:shadow-[0_0_12px_hsl(180_100%_60%_/_0.5)]"
          }`}
        >
          ← Anterior
        </button>

        {/* Page Info */}
        <div className="px-4 py-1.5 text-xs sm:text-sm text-vaporwave-cyan neon-glow-cyan uppercase tracking-wider font-bold border-2 border-vaporwave-cyan/50 rounded-md bg-card/50 backdrop-blur-md">
          Página {currentPage} de {totalPages}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={isLastPage}
          className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all uppercase tracking-wider font-bold border-2 ${
            isLastPage
              ? "bg-card/30 text-muted-foreground border-vaporwave-pink/20 cursor-not-allowed opacity-50"
              : "bg-vaporwave-pink text-primary-foreground border-vaporwave-pink hover:bg-vaporwave-pink/90 hover:shadow-[0_0_12px_hsl(320_100%_65%_/_0.5)]"
          }`}
        >
          Próxima →
        </button>
      </div>

      {/* Items Info */}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
        Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} artigos
      </p>
    </div>
  );
}

