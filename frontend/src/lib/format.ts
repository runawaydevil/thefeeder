/**
 * Formatting utilities for dates, text, etc.
 */

import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatRelativeTime(date: string | null): string {
  if (!date) return 'Desconhecido';
  
  try {
    const dateObj = new Date(date);
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
  } catch {
    return 'Desconhecido';
  }
}

export function formatFullDate(date: string | null): string {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    return format(dateObj, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '';
  }
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

