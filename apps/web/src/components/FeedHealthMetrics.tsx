"use client";

interface FeedHealthMetricsProps {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  successRate: number;
  avgResponseTime: number | null;
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
}

export default function FeedHealthMetrics({
  totalAttempts,
  totalSuccesses,
  totalFailures,
  successRate,
  avgResponseTime,
  lastSuccessAt,
  lastAttemptAt,
}: FeedHealthMetricsProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatResponseTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-3 rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Success Rate</div>
        <div className="text-2xl font-bold mt-1" style={{ color: successRate >= 80 ? 'var(--color-accent-primary)' : successRate >= 50 ? '#fbbf24' : '#ef4444' }}>
          {successRate}%
        </div>
      </div>

      <div className="p-3 rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total Attempts</div>
        <div className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
          {totalAttempts}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {totalSuccesses} success / {totalFailures} failed
        </div>
      </div>

      <div className="p-3 rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Avg Response Time</div>
        <div className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
          {formatResponseTime(avgResponseTime)}
        </div>
      </div>

      <div className="p-3 rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Last Success</div>
        <div className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>
          {formatDate(lastSuccessAt)}
        </div>
      </div>
    </div>
  );
}
