// Configuração centralizada do sistema de diversidade de feeds
export interface DiversityConfig {
  // Configurações básicas
  syncArticleLimit: number;
  maxArticlesPerFeed: number;
  minFeedsRequired: number;
  syncIntervalHours: number;

  // Timeouts de estratégias (ms)
  timeouts: {
    multipleFeeds: number;
    timeWindow: number;
    categoryBased: number;
    bulkRetrieval: number;
    global: number;
  };

  // Otimização de performance
  performance: {
    feedHealthCacheTTL: number;
    maxConcurrentStrategies: number;
    retryMaxAttempts: number;
    retryBaseDelay: number;
    retryMaxDelay: number;
    retryBackoffMultiplier: number;
  };

  // Gerenciamento de erros
  errorManagement: {
    maxConsecutiveFailures: number;
    errorRateThreshold: number;
    quarantineDuration: number;
    maxErrorLogSize: number;
  };

  // Cache
  cache: {
    maxCachedArticles: number;
    cleanupInterval: number;
    diversityHistoryMaxEntries: number;
  };

  // Validação de diversidade
  validation: {
    minDiversityScore: number;
    maxImbalanceRatio: number;
    giniCoefficientThreshold: number;
    entropyScoreThreshold: number;
  };
}

// Função para carregar configuração das variáveis de ambiente
function loadConfigFromEnv(): DiversityConfig {
  return {
    // Configurações básicas
    syncArticleLimit: parseInt(import.meta.env.VITE_SYNC_ARTICLE_LIMIT) || 100,
    maxArticlesPerFeed: parseInt(import.meta.env.VITE_MAX_ARTICLES_PER_FEED) || 15,
    minFeedsRequired: parseInt(import.meta.env.VITE_MIN_FEEDS_REQUIRED) || 3,
    syncIntervalHours: parseInt(import.meta.env.VITE_SYNC_INTERVAL_HOURS) || 2,

    // Timeouts
    timeouts: {
      multipleFeeds: parseInt(import.meta.env.VITE_MULTIPLE_FEEDS_TIMEOUT) || 15000,
      timeWindow: parseInt(import.meta.env.VITE_TIME_WINDOW_TIMEOUT) || 12000,
      categoryBased: parseInt(import.meta.env.VITE_CATEGORY_BASED_TIMEOUT) || 10000,
      bulkRetrieval: parseInt(import.meta.env.VITE_BULK_RETRIEVAL_TIMEOUT) || 8000,
      global: parseInt(import.meta.env.VITE_GLOBAL_RETRIEVAL_TIMEOUT) || 30000,
    },

    // Performance
    performance: {
      feedHealthCacheTTL: parseInt(import.meta.env.VITE_FEED_HEALTH_CACHE_TTL) || 300000, // 5 minutos
      maxConcurrentStrategies: parseInt(import.meta.env.VITE_MAX_CONCURRENT_STRATEGIES) || 2,
      retryMaxAttempts: parseInt(import.meta.env.VITE_RETRY_MAX_ATTEMPTS) || 3,
      retryBaseDelay: parseInt(import.meta.env.VITE_RETRY_BASE_DELAY) || 1000,
      retryMaxDelay: parseInt(import.meta.env.VITE_RETRY_MAX_DELAY) || 10000,
      retryBackoffMultiplier: parseFloat(import.meta.env.VITE_RETRY_BACKOFF_MULTIPLIER) || 2,
    },

    // Gerenciamento de erros
    errorManagement: {
      maxConsecutiveFailures: parseInt(import.meta.env.VITE_MAX_CONSECUTIVE_FAILURES) || 5,
      errorRateThreshold: parseFloat(import.meta.env.VITE_ERROR_RATE_THRESHOLD) || 0.8,
      quarantineDuration: parseInt(import.meta.env.VITE_QUARANTINE_DURATION) || 1800000, // 30 minutos
      maxErrorLogSize: parseInt(import.meta.env.VITE_MAX_ERROR_LOG_SIZE) || 1000,
    },

    // Cache
    cache: {
      maxCachedArticles: parseInt(import.meta.env.VITE_MAX_CACHED_ARTICLES) || 1000,
      cleanupInterval: parseInt(import.meta.env.VITE_CACHE_CLEANUP_INTERVAL) || 3600000, // 1 hora
      diversityHistoryMaxEntries: parseInt(import.meta.env.VITE_DIVERSITY_HISTORY_MAX_ENTRIES) || 100,
    },

    // Validação
    validation: {
      minDiversityScore: parseFloat(import.meta.env.VITE_MIN_DIVERSITY_SCORE) || 0.4,
      maxImbalanceRatio: parseFloat(import.meta.env.VITE_MAX_IMBALANCE_RATIO) || 5.0,
      giniCoefficientThreshold: parseFloat(import.meta.env.VITE_GINI_COEFFICIENT_THRESHOLD) || 0.6,
      entropyScoreThreshold: parseFloat(import.meta.env.VITE_ENTROPY_SCORE_THRESHOLD) || 0.7,
    },
  };
}

// Configuração global
export const diversityConfig: DiversityConfig = loadConfigFromEnv();

// Função para atualizar configuração em runtime (útil para testes)
export function updateConfig(updates: Partial<DiversityConfig>): void {
  Object.assign(diversityConfig, updates);
}

// Função para resetar configuração para padrões
export function resetConfig(): void {
  Object.assign(diversityConfig, loadConfigFromEnv());
}

// Função para validar configuração
export function validateConfig(config: DiversityConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar valores básicos
  if (config.syncArticleLimit <= 0) {
    errors.push('syncArticleLimit deve ser maior que 0');
  }

  if (config.maxArticlesPerFeed <= 0) {
    errors.push('maxArticlesPerFeed deve ser maior que 0');
  }

  if (config.minFeedsRequired <= 0) {
    errors.push('minFeedsRequired deve ser maior que 0');
  }

  // Validar timeouts
  Object.entries(config.timeouts).forEach(([key, value]) => {
    if (value <= 0) {
      errors.push(`timeout ${key} deve ser maior que 0`);
    }
  });

  // Validar performance
  if (config.performance.maxConcurrentStrategies <= 0) {
    errors.push('maxConcurrentStrategies deve ser maior que 0');
  }

  if (config.performance.retryMaxAttempts < 0) {
    errors.push('retryMaxAttempts deve ser maior ou igual a 0');
  }

  if (config.performance.retryBackoffMultiplier <= 1) {
    errors.push('retryBackoffMultiplier deve ser maior que 1');
  }

  // Validar thresholds
  if (config.errorManagement.errorRateThreshold < 0 || config.errorManagement.errorRateThreshold > 1) {
    errors.push('errorRateThreshold deve estar entre 0 e 1');
  }

  if (config.validation.minDiversityScore < 0 || config.validation.minDiversityScore > 1) {
    errors.push('minDiversityScore deve estar entre 0 e 1');
  }

  if (config.validation.giniCoefficientThreshold < 0 || config.validation.giniCoefficientThreshold > 1) {
    errors.push('giniCoefficientThreshold deve estar entre 0 e 1');
  }

  if (config.validation.entropyScoreThreshold < 0 || config.validation.entropyScoreThreshold > 1) {
    errors.push('entropyScoreThreshold deve estar entre 0 e 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função para obter configuração como string para debug
export function getConfigSummary(): string {
  const config = diversityConfig;
  return `
Diversity System Configuration:
- Article Limit: ${config.syncArticleLimit}
- Max Per Feed: ${config.maxArticlesPerFeed}
- Min Feeds: ${config.minFeedsRequired}
- Sync Interval: ${config.syncIntervalHours}h
- Global Timeout: ${config.timeouts.global}ms
- Max Concurrent: ${config.performance.maxConcurrentStrategies}
- Cache TTL: ${config.performance.feedHealthCacheTTL}ms
- Min Diversity Score: ${(config.validation.minDiversityScore * 100).toFixed(1)}%
`.trim();
}

// Função para obter configuração otimizada baseada no ambiente
export function getOptimizedConfig(): DiversityConfig {
  const baseConfig = loadConfigFromEnv();
  
  // Otimizações baseadas no ambiente
  if (import.meta.env.MODE === 'development') {
    // Desenvolvimento: timeouts menores, mais logs
    baseConfig.timeouts.global = Math.min(baseConfig.timeouts.global, 15000);
    baseConfig.performance.feedHealthCacheTTL = 60000; // 1 minuto
    baseConfig.cache.maxCachedArticles = 500;
  } else if (import.meta.env.MODE === 'production') {
    // Produção: timeouts maiores, cache maior
    baseConfig.performance.feedHealthCacheTTL = 600000; // 10 minutos
    baseConfig.cache.maxCachedArticles = 2000;
    baseConfig.performance.maxConcurrentStrategies = 3;
  }

  return baseConfig;
}

// Exportar configuração otimizada como padrão
export const optimizedConfig = getOptimizedConfig();