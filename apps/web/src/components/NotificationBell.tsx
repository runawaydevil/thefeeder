"use client";

import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  priority: 'low' | 'normal' | 'high';
  title: string;
  message: string;
  createdAt: Date;
  feed: {
    id: string;
    title: string;
  };
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#fbbf24';
      case 'success':
        return 'var(--color-accent-primary)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded hover:bg-opacity-10 transition-colors"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
            style={{ background: '#ef4444', color: 'white' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto"
          style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}
        >
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Notifications ({unreadCount})
            </h3>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
              No new notifications
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border-b hover:bg-opacity-5 transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: getNotificationColor(notification.type) }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {notification.title}
                        </span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {notification.message}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Feed: {notification.feed.title}
                      </p>
                    </div>
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs px-2 py-1 rounded hover:bg-opacity-10 transition-colors"
                      style={{ color: 'var(--color-accent-primary)' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
