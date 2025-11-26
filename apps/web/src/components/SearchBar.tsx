"use client";

import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search articles...",
  debounceMs = 500,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, onSearch, debounceMs]);

  return (
    <div className="relative w-full max-w-md mx-auto mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full min-h-[44px] px-4 py-2.5 text-sm sm:text-base bg-background/80 border-2 rounded-md text-foreground focus:outline-none transition-all"
        style={{
          borderColor: isFocused ? "var(--color-accent-primary)" : "var(--color-border)",
          boxShadow: isFocused ? "0 0 0 2px var(--color-accent-primary)" : "none",
          color: "var(--color-text-primary)",
          transition: "var(--theme-transition)",
        }}
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-text-secondary)" }}
        >
          ×
        </button>
      )}
    </div>
  );
}

