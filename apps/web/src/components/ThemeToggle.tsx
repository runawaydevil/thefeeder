"use client";

import { useTheme } from "@/src/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTheme();
    }
  };
  
  return (
    <button
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className="theme-toggle"
      aria-label={`Mudar para tema ${theme === "vaporwave" ? "clean" : "vaporwave"}`}
      aria-live="polite"
      title={`Tema atual: ${theme === "vaporwave" ? "Vaporwave" : "Clean"}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "0.25rem 0.5rem",
        minWidth: "44px",
        minHeight: "44px",
        transition: "opacity 0.2s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: "0.875rem",
        }}
      >
        {theme === "vaporwave" ? "🎨" : "📄"}
      </span>
      <span
        style={{
          fontSize: "0.625rem",
          fontWeight: "500",
          letterSpacing: "0.05em",
        }}
      >
        THEME
      </span>
    </button>
  );
}
