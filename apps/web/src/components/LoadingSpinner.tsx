"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = "md", 
  text,
  className = "" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 rounded-full animate-spin`}
        style={{
          borderColor: "var(--color-border)",
          borderTopColor: "var(--color-accent-primary)",
        }}
      />
      {text && (
        <p
          className="text-xs sm:text-sm uppercase tracking-wider"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

