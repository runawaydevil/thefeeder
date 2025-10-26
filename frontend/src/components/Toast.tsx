import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface Props {
  toast: Toast;
  onClose: () => void;
}

export function Toast({ toast, onClose }: Props) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  const Icon = icons[toast.type];

  useEffect(() => {
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className={`${colors[toast.type]} text-white rounded-lg shadow-lg p-4 min-w-[300px] flex items-center gap-3`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toast Context
interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType, duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(current => [...current, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}