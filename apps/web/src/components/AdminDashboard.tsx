"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import FeedsManager from "./FeedsManager";
import SubscribersManager from "./SubscribersManager";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"feeds" | "subscribers">("feeds");
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Fetch pending subscribers count
  const fetchPendingCount = async () => {
    try {
      const res = await fetch("/api/subscribers/count");
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pending || 0);
      }
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  // Poll for pending count every 30 seconds
  useEffect(() => {
    fetchPendingCount(); // Initial fetch
    const interval = setInterval(fetchPendingCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden scanlines">
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 50% 0%, hsl(320 100% 50% / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, hsl(270 100% 50% / 0.3), transparent 50%)'
      }} />
      
      <div className="relative z-10 p-3 md:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-4 md:mb-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="glow-soft">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-primary neon-glow-pink uppercase tracking-wider">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">Manage feeds and subscribers</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-1.5 text-xs md:text-sm bg-destructive/20 text-destructive border-2 border-destructive/50 rounded-md hover:bg-destructive/30 hover:shadow-[0_0_10px_hsl(0_84%_60%_/_0.5)] transition-all uppercase tracking-wider font-medium"
            >
              Sign Out
            </button>
          </header>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("feeds")}
              className={`px-4 py-2 text-xs md:text-sm rounded-md transition-all uppercase tracking-wider font-bold border-2 ${
                activeTab === "feeds"
                  ? "bg-vaporwave-pink text-primary-foreground border-vaporwave-pink shadow-[0_0_15px_hsl(320_100%_65%_/_0.5)]"
                  : "bg-card/50 text-muted-foreground border-vaporwave-pink/30 hover:bg-card/70 hover:border-vaporwave-pink/50"
              }`}
            >
              Feeds
            </button>
            <button
              onClick={() => setActiveTab("subscribers")}
              className={`relative px-4 py-2 text-xs md:text-sm rounded-md transition-all uppercase tracking-wider font-bold border-2 ${
                activeTab === "subscribers"
                  ? "bg-vaporwave-pink text-primary-foreground border-vaporwave-pink shadow-[0_0_15px_hsl(320_100%_65%_/_0.5)]"
                  : "bg-card/50 text-muted-foreground border-vaporwave-pink/30 hover:bg-card/70 hover:border-vaporwave-pink/50"
              }`}
            >
              Subscribers
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 rounded-full bg-vaporwave-cyan text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-primary shadow-[0_0_8px_hsl(180_100%_50%_/_0.6)] animate-pulse">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="cyber-card border-2 border-vaporwave-cyan/50 p-4 md:p-5 backdrop-blur-md">
            {activeTab === "feeds" && <FeedsManager />}
            {activeTab === "subscribers" && <SubscribersManager onSubscriberUpdate={fetchPendingCount} />}
          </div>
        </div>
      </div>
    </div>
  );
}

