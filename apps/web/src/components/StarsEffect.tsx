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
    // Mark as mounted after hydration is complete
    setMounted(true);
    
    // Generate stars only on client side after hydration
    const generatedStars: Star[] = Array.from({ length: 20 }, () => ({
      width: `${Math.random() * 2 + 1}px`,
      height: `${Math.random() * 2 + 1}px`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.5 + 0.2,
      boxShadow: `0 0 ${Math.random() * 8 + 3}px hsl(180 100% 60%)`,
    }));

    setStars(generatedStars);
  }, []);

  // Render empty container on server (SSR) to match client initial render
  // This ensures no hydration mismatch
  if (!mounted) {
    return <div className="absolute inset-0" suppressHydrationWarning />;
  }

  return (
    <div className="absolute inset-0">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-vaporwave-cyan"
          style={{
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
