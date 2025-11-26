"use client";

import { useState, useEffect } from 'react';
import FeedStatusBadge from './FeedStatusBadge';
import FeedHealthMetrics from './FeedHealthMetrics';
import FeedHealthChart from './FeedHealthChart';
import FeedAlternatives from './FeedAlternatives';
import { useToast } from "@/src/hooks/useToast";
import { ToastContainer } from "./Toast";

interface FeedDetailsProps {
  feedId: string;
  onClose: () => void;
}

export default function FeedDetails({ feedId, onClose }: FeedDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [retrying, setRetrying] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    fetchHealthData();
  }, [feedId]);

  const fetchHealthData = async () => {
    try {
      const res = await fetch(`/api/feeds/${feedId}/health`);
      if (res.ok) {
        const healthData = await res.json();
        setData(healthData);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/feeds/${feedId}/retry`, {
        method: 'POST',
      });
      if (res.ok) {
        success('Feed retry triggered successfully!');
        // Refresh health data after a delay
        setTimeout(fetchHealthData, 2000);
      } else {
        const data = await res.json();
        error(data.error || 'Failed to retry feed');
      }
    } catch (err) {
      console.error('Error retrying feed:', err);
      error('Failed to retry feed');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-background border-2 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-accent-secondary)', transition: 'var(--theme-transition)' }}>
          <p style={{ color: 'var(--color-text-primary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { feed, metrics, recentLogs } = data;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="bg-background border-2 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-accent-secondary)', transition: 'var(--theme-transition)' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {feed.title}
              </h2>
              <FeedStatusBadge status={feed.status} />
            </div>
            <p className="text-sm break-all" style={{ color: 'var(--color-text-secondary)' }}>
              {feed.url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded hover:bg-opacity-10 transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {feed.consecutiveFailures > 0 && feed.lastError && (
          <div className="mb-6 p-4 rounded border border-red-500/30 bg-red-500/10">
            <h3 className="text-sm font-bold text-red-400 mb-2">
              ⚠️ {feed.consecutiveFailures} Consecutive Failure{feed.consecutiveFailures > 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-red-400">{feed.lastError}</p>
          </div>
        )}

        {/* Feed Alternatives */}
        {feed.metadata?.alternatives && feed.metadata.alternatives.length > 0 && (
          <div className="mb-6">
            <FeedAlternatives
              feedId={feedId}
              currentUrl={feed.url}
              alternatives={feed.metadata.alternatives}
              onUrlReplaced={fetchHealthData}
            />
          </div>
        )}

        {/* Health Metrics */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-accent-primary)' }}>
            Health Metrics
          </h3>
          <FeedHealthMetrics {...metrics} />
        </div>

        {/* Health Chart */}
        <div className="mb-6">
          <FeedHealthChart logs={recentLogs} />
        </div>

        {/* Recent Logs */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-accent-primary)' }}>
            Recent Attempts
          </h3>
          <div className="space-y-2">
            {recentLogs.slice(0, 5).map((log: any, index: number) => (
              <div
                key={index}
                className="p-3 rounded border"
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderColor: log.success ? 'var(--color-accent-primary)' : '#ef4444',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: log.success ? 'var(--color-accent-primary)' : '#ef4444' }}>
                    {log.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(log.attemptedAt).toLocaleString()}
                  </span>
                </div>
                {log.responseTime && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Response time: {log.responseTime}ms
                  </p>
                )}
                {log.errorMessage && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                    {log.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex-1 min-h-[44px] px-4 py-2 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-accent-primary)',
              color: 'var(--color-bg-primary)',
              borderColor: 'var(--color-accent-primary)',
            }}
          >
            {retrying ? 'Retrying...' : 'Retry Now'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border transition-all"
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
