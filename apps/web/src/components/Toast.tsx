"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      bg: "rgba(0, 255, 0, 0.1)",
      border: "rgba(0, 255, 0, 0.5)",
      text: "#00ff00",
    },
    error: {
      bg: "rgba(255, 0, 0, 0.1)",
      border: "rgba(255, 0, 0, 0.5)",
      text: "#ff006e",
    },
    warning: {
      bg: "rgba(255, 165, 0, 0.1)",
      border: "rgba(255, 165, 0, 0.5)",
      text: "#ffa500",
    },
    info: {
      bg: "rgba(0, 217, 255, 0.1)",
      border: "rgba(0, 217, 255, 0.5)",
      text: "#00d9ff",
    },
  };

  const style = typeStyles[type];

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-2 shadow-lg transition-all duration-300 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      }`}
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
        maxWidth: "400px",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: style.text }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

