/**
 * Date formatting utilities using timezone from environment variable
 * Ensures consistent date/time display across the application
 * 
 * Timezone is read from environment variable:
 * - Server-side: process.env.TZ
 * - Client-side: process.env.NEXT_PUBLIC_TZ
 * Both default to "America/Sao_Paulo" if not set
 */

// Get timezone from environment variable
// In Next.js, server-side can use process.env.TZ directly
// Client-side needs NEXT_PUBLIC_TZ (set in docker-compose.yml and .env)
const TIMEZONE = typeof window === 'undefined' 
  ? (process.env.TZ || "America/Sao_Paulo")
  : (process.env.NEXT_PUBLIC_TZ || "America/Sao_Paulo");
const LOCALE = "pt-BR";

/**
 * Format date only (DD/MM/YYYY)
 * Uses São Paulo timezone
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return "";
    }
    
    return date.toLocaleDateString(LOCALE, {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Format date and time (DD/MM/YYYY HH:MM)
 * Uses São Paulo timezone
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return "";
    }
    
    return date.toLocaleString(LOCALE, {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date/time:", error);
    return "";
  }
}

/**
 * Format date and time with seconds (DD/MM/YYYY HH:MM:SS)
 * Uses São Paulo timezone
 */
export function formatDateTimeFull(dateString: string | Date | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return "";
    }
    
    return date.toLocaleString(LOCALE, {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting full date/time:", error);
    return "";
  }
}

/**
 * Format relative time (e.g., "há 2 horas", "há 3 dias")
 * Uses São Paulo timezone
 */
export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return "";
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return "agora";
    } else if (diffMinutes < 60) {
      return `há ${diffMinutes} minuto${diffMinutes !== 1 ? "s" : ""}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
    } else if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
    } else {
      return formatDate(date);
    }
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "";
  }
}

