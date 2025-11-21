"use client";

type FeedStatus = 'active' | 'degraded' | 'blocked' | 'unreachable' | 'paused';

interface FeedStatusBadgeProps {
  status: FeedStatus;
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Active',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    description: 'Functioning normally',
  },
  degraded: {
    label: 'Degraded',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    description: 'Occasional failures but still working',
  },
  blocked: {
    label: 'Blocked',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    description: 'Consistently blocked (403/522)',
  },
  unreachable: {
    label: 'Unreachable',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    description: 'Consistently timing out',
  },
  paused: {
    label: 'Paused',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    description: 'Manually or automatically paused',
  },
};

export default function FeedStatusBadge({ status, className = '' }: FeedStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${config.color} ${className}`}
      title={config.description}
    >
      {config.label}
    </span>
  );
}
