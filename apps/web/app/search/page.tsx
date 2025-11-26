"use client";

import { useState, useEffect, useCallback } from "react";
import FeedList from "@/src/components/FeedList";
import SearchBar from "@/src/components/SearchBar";
import ItemFilters, { FilterState } from "@/src/components/ItemFilters";
import LoadingSpinner from "@/src/components/LoadingSpinner";
import { useToast } from "@/src/hooks/useToast";
import { ToastContainer } from "@/src/components/Toast";
import { handleApiError } from "@/src/lib/error-handler";

interface Item {
  id: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  author?: string;
  likes?: number;
  dislikes?: number;
  feed?: {
    title: string;
    url?: string;
  };
}

export default function SearchPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    feedId: null,
    startDate: null,
    endDate: null,
    sortBy: "publishedAt",
    sortOrder: "desc",
  });
  const [feeds, setFeeds] = useState<Array<{ id: string; title: string }>>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

  // Load feeds for filter dropdown
  useEffect(() => {
    fetch("/api/feeds")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFeeds(data.map((f: any) => ({ id: f.id, title: f.title })));
        }
      })
      .catch(() => {
        // Silently fail - filters will just be empty
      });
  }, []);

  // Fetch items when search or filters change
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (filters.feedId) {
        params.append("feedId", filters.feedId);
      }
      if (filters.startDate) {
        params.append("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.append("endDate", filters.endDate);
      }
      params.append("sortBy", filters.sortBy);
      params.append("sortOrder", filters.sortOrder);
      params.append("limit", itemsPerPage.toString());
      params.append("skip", ((currentPage - 1) * itemsPerPage).toString());

      const res = await fetch(`/api/items?${params.toString()}`);
      
      if (!res.ok) {
        const errorMessage = await handleApiError(res, "Failed to fetch items");
        showError(errorMessage);
        return;
      }

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      showError("Network error. Please check your connection.");
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, currentPage, showError]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/items/export?format=csv&minLikes=1");
      if (!res.ok) {
        const errorMessage = await handleApiError(res, "Failed to export");
        showError(errorMessage);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thefeeder-favorites-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showSuccess("Export downloaded successfully!");
    } catch (err) {
      showError("Failed to export favorites");
      console.error("Export error:", err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto" style={{ background: 'var(--color-bg-primary)', transition: 'var(--theme-transition)' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <header className="relative z-10 pt-6 md:pt-8 pb-4 md:pb-6 flex flex-col items-center gap-3 md:gap-4">
        <div className="glow-soft">
          <img src="/logo.png" alt="The Feeder Logo" className="w-16 h-16 md:w-20 md:h-20" />
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold leading-tight" style={{ color: 'var(--color-accent-primary)', fontFamily: 'var(--font-heading)', textShadow: 'var(--shadow-glow-strong)' }}>
          SEARCH ARTICLES
        </h1>
      </header>

      <div className="relative z-10 px-3 sm:px-4 md:px-6 pb-6 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar onSearch={handleSearch} placeholder="Search by title, content, author..." />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <ItemFilters feeds={feeds} filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Export Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm border rounded-md hover:opacity-80 transition-opacity"
            style={{
              borderColor: "var(--color-accent-secondary)",
              color: "var(--color-accent-secondary)",
            }}
          >
            📥 Export Favorites (CSV)
          </button>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Found {total} article{total !== 1 ? "s" : ""}
            {searchQuery && ` for "${searchQuery}"`}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Searching..." />
          </div>
        ) : (
          <>
            {/* Feed List */}
            <FeedList items={items} />

            {/* Pagination */}
            {total > itemsPerPage && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Page {currentPage} of {Math.ceil(total / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= Math.ceil(total / itemsPerPage)}
                  className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

