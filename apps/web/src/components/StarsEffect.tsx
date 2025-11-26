"use client";

import { useEffect, useState } from "react";

interface Star {
  width: string;
  height: string;
  top: string;
  left: string;
  opacity: number;
  boxShadow: string;
}

/**
 * Client-side component to render stars/particles effect
 * Generates random stars only on the client after hydration to avoid hydration errors
 * Uses mounted state to ensure server and client render identically (empty container)
 */
export default function StarsEffect() {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Wait for hydration to complete before showing stars
    // This ensures React hydration finishes before we modify the DOM
    const timer = setTimeout(() => {
      setMounted(true);
      
      // Generate stars only on client side after hydration
      // Get accent color from CSS variable
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-secondary').trim();
      const generatedStars: Star[] = Array.from({ length: 20 }, () => ({
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        opacity: Math.random() * 0.5 + 0.2,
        boxShadow: `0 0 ${Math.random() * 8 + 3}px ${accentColor}`,
      }));

      setStars(generatedStars);
    }, 0); // Use setTimeout(0) to ensure this runs after React hydration completes

    return () => clearTimeout(timer);
  }, []);

  // Render empty container on server (SSR) and during initial client render
  // This ensures no hydration mismatch - both SSR and initial CSR render the same
  if (!mounted) {
    return <div className="absolute inset-0" />;
  }

  return (
    <div className="absolute inset-0">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            backgroundColor: 'var(--color-accent-secondary)',
            transition: 'var(--theme-transition)',
            width: star.width,
            height: star.height,
            top: star.top,
            left: star.left,
            opacity: star.opacity,
            boxShadow: star.boxShadow,
          }}
        />
      ))}
    </div>
  );
}
