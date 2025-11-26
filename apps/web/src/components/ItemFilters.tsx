"use client";

import { useState } from "react";

export interface FilterState {
  feedId: string | null;
  startDate: string | null;
  endDate: string | null;
  sortBy: "publishedAt" | "createdAt" | "likes";
  sortOrder: "asc" | "desc";
}

interface ItemFiltersProps {
  feeds: Array<{ id: string; title: string }>;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export default function ItemFilters({
  feeds,
  filters,
  onFiltersChange,
}: ItemFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      feedId: null,
      startDate: null,
      endDate: null,
      sortBy: "publishedAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.feedId || filters.startDate || filters.endDate;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:opacity-80 transition-opacity"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <span>🔍 Filters</span>
        {hasActiveFilters && (
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{
              background: "var(--color-accent-primary)",
              color: "var(--color-bg-primary)",
            }}
          >
            Active
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="mt-2 p-4 rounded-md border space-y-4"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Feed Filter */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Feed
            </label>
            <select
              value={filters.feedId || ""}
              onChange={(e) => updateFilter("feedId", e.target.value || null)}
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border rounded-md"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value="">All Feeds</option>
              {feeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => updateFilter("startDate", e.target.value || null)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border rounded-md"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--color-text-secondary)" }}
              >
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => updateFilter("endDate", e.target.value || null)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border rounded-md"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  updateFilter("sortBy", e.target.value as FilterState["sortBy"])
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border rounded-md"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <option value="publishedAt">Published Date</option>
                <option value="createdAt">Created Date</option>
                <option value="likes">Likes</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Order
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) =>
                  updateFilter(
                    "sortOrder",
                    e.target.value as FilterState["sortOrder"],
                  )
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-background border rounded-md"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm border rounded-md hover:opacity-80 transition-opacity"
              style={{
                borderColor: "var(--color-accent-secondary)",
                color: "var(--color-accent-secondary)",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

