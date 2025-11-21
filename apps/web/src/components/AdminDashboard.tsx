"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import FeedsManager from "./FeedsManager";
import SubscribersManager from "./SubscribersManager";
import NotificationBell from "./NotificationBell";
import BrowserAutomationStats from "./BrowserAutomationStats";

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
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines">
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 50% 0%, hsl(320 100% 50% / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, hsl(270 100% 50% / 0.3), transparent 50%)'
      }} />
      
      <div className="relative z-10 p-3 md:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="glow-soft flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-primary neon-glow-pink uppercase tracking-wider truncate">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5 truncate">Manage feeds and subscribers</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="min-h-[44px] px-3 py-1.5 text-xs sm:text-sm bg-destructive/10 text-destructive/90 border border-destructive/40 rounded hover:bg-destructive/20 hover:border-destructive/60 transition-all uppercase tracking-wider font-normal flex-shrink-0 w-full sm:w-auto touch-manipulation"
              >
                Sign Out
              </button>
            </div>
          </header>

          {/* Browser Automation Stats */}
          <div className="mb-4">
            <BrowserAutomationStats />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("feeds")}
              className={`min-h-[44px] px-3 py-1.5 text-xs sm:text-sm rounded transition-all uppercase tracking-wider font-normal border touch-manipulation ${
                activeTab === "feeds"
                  ? "bg-vaporwave-pink/20 text-vaporwave-pink border-vaporwave-pink/60 shadow-[0_0_8px_hsl(320_100%_65%_/_0.3)]"
                  : "bg-card/30 text-muted-foreground border-vaporwave-pink/20 hover:bg-card/50 hover:border-vaporwave-pink/40"
              }`}
            >
              Feeds
            </button>
            <button
              onClick={() => setActiveTab("subscribers")}
              className={`relative min-h-[44px] px-3 py-1.5 text-xs sm:text-sm rounded transition-all uppercase tracking-wider font-normal border touch-manipulation ${
                activeTab === "subscribers"
                  ? "bg-vaporwave-pink/20 text-vaporwave-pink border-vaporwave-pink/60 shadow-[0_0_8px_hsl(320_100%_65%_/_0.3)]"
                  : "bg-card/30 text-muted-foreground border-vaporwave-pink/20 hover:bg-card/50 hover:border-vaporwave-pink/40"
              }`}
            >
              Subscribers
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-vaporwave-cyan text-primary-foreground text-[9px] font-medium flex items-center justify-center border border-primary shadow-[0_0_6px_hsl(180_100%_50%_/_0.4)] animate-pulse">
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

