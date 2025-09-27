// Sistema de cache otimizado para performance
import { diversityConfig } from './config';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

class PerformanceCacheImpl<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    cleanups: 0
  };

  constructor(
    private defaultTTL: number = 300000, // 5 minutos
    private maxSize: number = 1000
  ) {
    // Limpeza automática a cada 5 minutos
    setInterval(() => this.cleanup(), 300000);
  }

  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    // Limpar cache se exceder tamanho máximo
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Atualizar estatísticas
    entry.hits++;
    this.stats.hits++;
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    };
  }

  // Limpeza de entradas expiradas
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.stats.cleanups++;
    return cleaned;
  }

  // Remover entrada mais antiga (LRU)
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Obter estatísticas do cache
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  // Estimar uso de memória (aproximado)
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // String UTF-16
      size += JSON.stringify(entry.data).length * 2;
      size += 32; // Overhead do objeto
    }
    return size;
  }

  // Obter entradas mais acessadas
  getHotEntries(limit: number = 10): Array<{ key: string; hits: number; age: number }> {
    const entries: Array<{ key: string; hits: number; age: number }> = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        hits: entry.hits,
        age: now - entry.timestamp
      });
    }

    return entries
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  // Pré-aquecer cache com dados
  warmup(data: Record<string, T>, ttl?: number): void {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
  }

  // Invalidar entradas por padrão
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  // Obter todas as chaves
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Obter tamanho atual
  size(): number {
    return this.cache.size;
  }
}

// Cache específico para saúde dos feeds
export const feedHealthCache = new PerformanceCacheImpl(
  diversityConfig.performance.feedHealthCacheTTL,
  100 // Máximo 100 feeds
);

// Cache para resultados de estratégias
export const strategyResultsCache = new PerformanceCacheImpl(
  60000, // 1 minuto
  50 // Máximo 50 resultados
);

// Cache para métricas de diversidade
export const diversityMetricsCache = new PerformanceCacheImpl(
  120000, // 2 minutos
  20 // Máximo 20 métricas
);

// Cache para distribuição de feeds
export const feedDistributionCache = new PerformanceCacheImpl(
  300000, // 5 minutos
  10 // Máximo 10 distribuições
);

// Função para obter estatísticas de todos os caches
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    feedHealth: feedHealthCache.getStats(),
    strategyResults: strategyResultsCache.getStats(),
    diversityMetrics: diversityMetricsCache.getStats(),
    feedDistribution: feedDistributionCache.getStats()
  };
}

// Função para limpar todos os caches
export function clearAllCaches(): void {
  feedHealthCache.clear();
  strategyResultsCache.clear();
  diversityMetricsCache.clear();
  feedDistributionCache.clear();
}

// Função para fazer limpeza de todos os caches
export function cleanupAllCaches(): number {
  return (
    feedHealthCache.cleanup() +
    strategyResultsCache.cleanup() +
    diversityMetricsCache.cleanup() +
    feedDistributionCache.cleanup()
  );
}

// Função para pré-aquecer caches com dados iniciais
export function warmupCaches(): void {
  // Pré-aquecer com dados padrão se necessário
  console.log('Cache warmup completed');
}

// Função para monitorar performance dos caches
export function getCachePerformanceReport(): {
  totalMemoryUsage: number;
  totalEntries: number;
  averageHitRate: number;
  recommendations: string[];
} {
  const stats = getAllCacheStats();
  const cacheNames = Object.keys(stats);
  
  const totalMemoryUsage = cacheNames.reduce((sum, name) => sum + stats[name].memoryUsage, 0);
  const totalEntries = cacheNames.reduce((sum, name) => sum + stats[name].totalEntries, 0);
  const averageHitRate = cacheNames.reduce((sum, name) => sum + stats[name].hitRate, 0) / cacheNames.length;
  
  const recommendations: string[] = [];
  
  // Gerar recomendações baseadas nas estatísticas
  if (averageHitRate < 0.5) {
    recommendations.push('Taxa de acerto baixa - considere aumentar TTL dos caches');
  }
  
  if (totalMemoryUsage > 10 * 1024 * 1024) { // 10MB
    recommendations.push('Alto uso de memória - considere reduzir tamanho dos caches');
  }
  
  cacheNames.forEach(name => {
    const stat = stats[name];
    if (stat.hitRate < 0.3) {
      recommendations.push(`Cache ${name} com baixa eficiência - revisar estratégia`);
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('Performance dos caches está adequada');
  }
  
  return {
    totalMemoryUsage,
    totalEntries,
    averageHitRate,
    recommendations
  };
}