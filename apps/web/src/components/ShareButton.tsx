"use client";

import { useState, useEffect, useRef } from "react";

interface ShareButtonProps {
  itemId: string;
  title: string;
  url: string;
}

type SharePlatform = "twitter" | "facebook" | "linkedin" | "whatsapp" | "copy";

export default function ShareButton({ itemId, title, url }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleShare = (platform: SharePlatform) => {
    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(url);

    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        window.open(shareUrl, "_blank", "width=600,height=400");
        break;

      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        window.open(shareUrl, "_blank", "width=600,height=400");
        break;

      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        window.open(shareUrl, "_blank", "width=600,height=400");
        break;

      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        window.open(shareUrl, "_blank");
        break;

      case "copy":
        handleCopyLink();
        break;
    }

    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 3000);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link. Please try again.");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Share Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="share-button"
        aria-label="Share article"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.25rem 0.5rem",
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: "500",
          cursor: "pointer",
          transition: "all 0.2s ease",
          minWidth: "44px",
          minHeight: "44px",
          background: "var(--gradient-card)",
          border: "2px solid var(--color-border)",
          color: "var(--color-text-primary)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span aria-hidden="true">🔗</span>
        <span className="hidden sm:inline">Share</span>
      </button>

      {/* Share Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Share options"
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            zIndex: 50,
            minWidth: "200px",
            background: "var(--color-bg-secondary)",
            border: "2px solid var(--color-border)",
            borderRadius: "0.5rem",
            boxShadow: "var(--shadow-card)",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <button
            role="menuitem"
            onClick={() => handleShare("twitter")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background 0.2s ease",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-primary)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
          >
            <span aria-hidden="true">🐦</span>
            <span>Twitter</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleShare("facebook")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background 0.2s ease",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-primary)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
          >
            <span aria-hidden="true">📘</span>
            <span>Facebook</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleShare("linkedin")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background 0.2s ease",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-primary)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
          >
            <span aria-hidden="true">💼</span>
            <span>LinkedIn</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleShare("whatsapp")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background 0.2s ease",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-primary)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
          >
            <span aria-hidden="true">💬</span>
            <span>WhatsApp</span>
          </button>

          <div
            style={{
              height: "1px",
              background: "var(--color-border)",
              margin: "0.25rem 0",
            }}
          />

          <button
            role="menuitem"
            onClick={() => handleShare("copy")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              background: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background 0.2s ease",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-primary)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
          >
            <span aria-hidden="true">📋</span>
            <span>Copy Link</span>
          </button>
        </div>
      )}

      {/* Copy Success Toast */}
      {showCopySuccess && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 100,
            background: "var(--color-accent-primary)",
            color: "#FFFFFF",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            fontSize: "0.875rem",
            fontWeight: "500",
            animation: "slideIn 0.3s ease",
          }}
        >
          ✓ Link copied!
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
