"use client";

interface HealthLog {
  attemptedAt: Date;
  success: boolean;
  errorMessage?: string | null;
}

interface FeedHealthChartProps {
  logs: HealthLog[];
}

export default function FeedHealthChart({ logs }: FeedHealthChartProps) {
  if (logs.length === 0) {
    return (
      <div className="p-6 text-center rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Not enough data yet. Health chart will appear after more fetch attempts.
        </p>
      </div>
    );
  }

  // Group logs by day
  const logsByDay = logs.reduce((acc, log) => {
    const date = new Date(log.attemptedAt);
    const dayKey = date.toISOString().split('T')[0];
    
    if (!acc[dayKey]) {
      acc[dayKey] = { success: 0, failed: 0, date: dayKey };
    }
    
    if (log.success) {
      acc[dayKey].success++;
    } else {
      acc[dayKey].failed++;
    }
    
    return acc;
  }, {} as Record<string, { success: number; failed: number; date: string }>);

  const chartData = Object.values(logsByDay).slice(-7); // Last 7 days

  const maxCount = Math.max(...chartData.map(d => d.success + d.failed));

  return (
    <div className="p-4 rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        7-Day Health History
      </h3>
      
      <div className="flex items-end justify-between gap-2 h-48">
        {chartData.map((day, index) => {
          const total = day.success + day.failed;
          const successHeight = maxCount > 0 ? (day.success / maxCount) * 100 : 0;
          const failedHeight = maxCount > 0 ? (day.failed / maxCount) * 100 : 0;
          const date = new Date(day.date);
          const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
                {day.success > 0 && (
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${successHeight}%`,
                      background: 'var(--color-accent-primary)',
                      minHeight: '4px',
                    }}
                    title={`${day.success} successful attempts`}
                  />
                )}
                {day.failed > 0 && (
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${failedHeight}%`,
                      background: 'hsl(var(--destructive))',
                      minHeight: '4px',
                    }}
                    title={`${day.failed} failed attempts`}
                  />
                )}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {dayLabel}
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {total}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: 'var(--color-accent-primary)' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>Success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>Failed</span>
        </div>
      </div>
    </div>
  );
}
