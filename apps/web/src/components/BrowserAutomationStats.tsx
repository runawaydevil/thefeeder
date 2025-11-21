"use client";

import { useState, useEffect } from 'react';

interface BrowserAutomationStatsProps {
  className?: string;
}

interface BrowserStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  avgResponseTime: number | null;
  feedsUsingBrowser: number;
}

export default function BrowserAutomationStats({ className = '' }: BrowserAutomationStatsProps) {
  const [stats, setStats] = useState<BrowserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/browser-automation/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching browser automation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatResponseTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className={`p-4 rounded border ${className}`} style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-accent-primary)' }}>
          Browser Automation
        </h3>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`p-4 rounded border ${className}`} style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-accent-primary)' }}>
        Browser Automation (Last 7 Days)
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Success Rate</div>
          <div className="text-lg font-bold" style={{ color: stats.successRate >= 80 ? 'var(--color-accent-primary)' : stats.successRate >= 50 ? '#fbbf24' : '#ef4444' }}>
            {stats.successRate}%
          </div>
        </div>
        
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Feeds Using Browser</div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {stats.feedsUsingBrowser}
          </div>
        </div>
        
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total Attempts</div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {stats.totalAttempts}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {stats.successfulAttempts} success / {stats.failedAttempts} failed
          </div>
        </div>
        
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Avg Response Time</div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {formatResponseTime(stats.avgResponseTime)}
          </div>
        </div>
      </div>

      {stats.feedsUsingBrowser > 0 && (
        <div className="mt-3 p-2 rounded" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            🤖 {stats.feedsUsingBrowser} feed{stats.feedsUsingBrowser > 1 ? 's' : ''} require{stats.feedsUsingBrowser === 1 ? 's' : ''} browser automation to bypass blocking
          </p>
        </div>
      )}
    </div>
  );
}
