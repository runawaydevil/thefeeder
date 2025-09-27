// Configuração avançada para o sistema de logging
import { AlertRule, LoggerConfig } from './logger';

// Configuração padrão do logger
export const defaultLoggingConfig: LoggerConfig = {
  level: (import.meta.env.VITE_LOG_LEVEL as any) || 'info',
  maxEntries: parseInt(import.meta.env.VITE_MAX_LOG_ENTRIES) || 2000,
  enableConsole: import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false',
  enableStorage: import.meta.env.VITE_ENABLE_STORAGE_LOGS !== 'false',
  categories: [
    'sync', 
    'diversity', 
    'feeds', 
    'performance', 
    'errors', 
    'audit', 
    'alerts', 
    'recovery',
    'strategy_performance',
    'feed_performance'
  ]
};

// Regras de alerta padrão para produção
export const productionAlertRules: AlertRule[] = [
  {
    id: 'diversity-score-critical',
    name: 'Diversity Score Critical',
    condition: { type: 'diversity_score', operator: 'lt' },
    threshold: 0.2, // 20%
    timeWindow: 5 * 60 * 1000, // 5 minutos
    enabled: true,
    severity: 'critical',
    actions: [{ type: 'log' }, { type: 'console' }, { type: 'storage' }]
  },
  {
    id: 'diversity-score-warning',
    name: 'Diversity Score Warning',
    condition: { type: 'diversity_score', operator: 'lt' },
    threshold: 0.4, // 40%
    timeWindow: 10 * 60 * 1000, // 10 minutos
    enabled: true,
    severity: 'warning',
    actions: [{ type: 'log' }, { type: 'console' }]
  },
  {
    id: 'feed-count-critical',
    name: 'Too Few Active Feeds - Critical',
    condition: { type: 'feed_count', operator: 'lt' },
    threshold: 2,
    timeWindow: 5 * 60 * 1000, // 5 minutos
    enabled: true,
    severity: 'critical',
    actions: [{ type: 'log' }, { type: 'console' }, { type: 'storage' }]
  },
  {
    id: 'feed-count-warning',
    name: 'Too Few Active Feeds - Warning',
    condition: { type: 'feed_count', operator: 'lt' },
    threshold: 5,
    timeWindow: 15 * 60 * 1000, // 15 minutos
    enabled: true,
    severity: 'warning',
    actions: [{ type: 'log' }, { type: 'console' }]
  },
  {
    id: 'feed-health-critical',
    name: 'Feed Health Critical Change',
    condition: { type: 'feed_health', operator: 'eq' },
    threshold: 1, // Qualquer mudança para status crítico
    timeWindow: 1 * 60 * 1000, // 1 minuto
    enabled: true,
    severity: 'critical',
    actions: [{ type: 'log' }, { type: 'console' }, { type: 'storage' }]
  },
  {
    id: 'performance-critical',
    name: 'Performance Critical Degradation',
    condition: { type: 'performance', operator: 'gt' },
    threshold: 30000, // 30 segundos
    timeWindow: 5 * 60 * 1000, // 5 minutos
    enabled: true,
    severity: 'critical',
    actions: [{ type: 'log' }, { type: 'console' }, { type: 'storage' }]
  },
  {
    id: 'performance-warning',
    name: 'Performance Warning',
    condition: { type: 'performance', operator: 'gt' },
    threshold: 15000, // 15 segundos
    timeWindow: 10 * 60 * 1000, // 10 minutos
    enabled: true,
    severity: 'warning',
    actions: [{ type: 'log' }, { type: 'console' }]
  },
  {
    id: 'error-rate-high',
    name: 'High Error Rate',
    condition: { type: 'error_rate', operator: 'gt' },
    threshold: 0.2, // 20% de erro
    timeWindow: 15 * 60 * 1000, // 15 minutos
    enabled: true,
    severity: 'warning',
    actions: [{ type: 'log' }, { type: 'console' }]
  }
];

// Regras de alerta para desenvolvimento
export const developmentAlertRules: AlertRule[] = [
  {
    id: 'dev-diversity-score-low',
    name: 'Dev: Diversity Score Low',
    condition: { type: 'diversity_score', operator: 'lt' },
    threshold: 0.3, // 30%
    timeWindow: 2 * 60 * 1000, // 2 minutos
    enabled: true,
    severity: 'info',
    actions: [{ type: 'console' }]
  },
  {
    id: 'dev-feed-count-low',
    name: 'Dev: Few Active Feeds',
    condition: { type: 'feed_count', operator: 'lt' },
    threshold: 3,
    timeWindow: 5 * 60 * 1000, // 5 minutos
    enabled: true,
    severity: 'info',
    actions: [{ type: 'console' }]
  },
  {
    id: 'dev-performance-slow',
    name: 'Dev: Performance Slow',
    condition: { type: 'performance', operator: 'gt' },
    threshold: 10000, // 10 segundos
    timeWindow: 5 * 60 * 1000, // 5 minutos
    enabled: true,
    severity: 'info',
    actions: [{ type: 'console' }]
  }
];

// Thresholds para métricas de performance
export const performanceThresholds = {
  // Tempos de resposta (em ms)
  sync_total_time: 60000, // 1 minuto
  article_retrieval_time: 15000, // 15 segundos
  strategy_response_time: 10000, // 10 segundos
  feed_response_time: 5000, // 5 segundos
  
  // Contadores mínimos
  articles_retrieved: 5,
  articles_per_feed: 3,
  active_feeds: 3,
  unique_feeds_in_result: 3,
  
  // Scores e ratios
  diversity_score: 0.4, // 40%
  balance_index: 0.5, // 50%
  gini_coefficient: 0.6, // 60% (menor é melhor)
  entropy_score: 0.4, // 40%
  
  // Taxas de erro
  error_rate: 0.1, // 10%
  feed_availability: 0.9, // 90%
  success_rate: 0.8 // 80%
};

// Configuração de categorias de log com descrições
export const logCategories = {
  sync: {
    name: 'Synchronization',
    description: 'Logs relacionados ao processo de sincronização',
    level: 'info'
  },
  diversity: {
    name: 'Feed Diversity',
    description: 'Logs sobre análise e validação de diversidade',
    level: 'info'
  },
  feeds: {
    name: 'Feed Management',
    description: 'Logs específicos de feeds individuais',
    level: 'info'
  },
  performance: {
    name: 'Performance Metrics',
    description: 'Métricas de performance e tempo de resposta',
    level: 'debug'
  },
  errors: {
    name: 'Error Handling',
    description: 'Logs de erros e exceções',
    level: 'error'
  },
  audit: {
    name: 'Audit Trail',
    description: 'Logs de auditoria para mudanças de estado',
    level: 'info'
  },
  alerts: {
    name: 'Alert System',
    description: 'Logs do sistema de alertas',
    level: 'warn'
  },
  recovery: {
    name: 'Recovery Process',
    description: 'Logs estruturados do processo de recuperação',
    level: 'info'
  },
  strategy_performance: {
    name: 'Strategy Performance',
    description: 'Métricas específicas por estratégia de recuperação',
    level: 'debug'
  },
  feed_performance: {
    name: 'Feed Performance',
    description: 'Métricas específicas por feed',
    level: 'debug'
  }
};

// Configuração de retenção de dados
export const retentionConfig = {
  logs: {
    maxEntries: 2000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    cleanupInterval: 60 * 60 * 1000 // 1 hora
  },
  metrics: {
    maxEntries: 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    cleanupInterval: 60 * 60 * 1000 // 1 hora
  },
  audit: {
    maxEntries: 500,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 horas
  },
  alerts: {
    maxEntries: 200,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    cleanupInterval: 60 * 60 * 1000 // 1 hora
  }
};

// Função para obter configuração baseada no ambiente
export function getEnvironmentConfig(): {
  logging: LoggerConfig;
  alerts: AlertRule[];
  thresholds: typeof performanceThresholds;
} {
  const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
  
  return {
    logging: {
      ...defaultLoggingConfig,
      level: isDevelopment ? 'debug' : 'info',
      enableConsole: isDevelopment ? true : defaultLoggingConfig.enableConsole
    },
    alerts: isDevelopment ? developmentAlertRules : productionAlertRules,
    thresholds: performanceThresholds
  };
}

// Função para configurar logger com configurações do ambiente
export function configureLogger() {
  const config = getEnvironmentConfig();
  
  // Importar logger dinamicamente para evitar problemas de inicialização
  import('./logger').then(({ logger }) => {
    logger.configure(config.logging);
    
    // Adicionar regras de alerta do ambiente
    config.alerts.forEach(rule => {
      logger.addAlertRule(rule);
    });
  });
}

// Função para obter configuração de threshold para uma métrica específica
export function getMetricThreshold(metricName: string): number | undefined {
  return performanceThresholds[metricName as keyof typeof performanceThresholds];
}

// Função para verificar se uma categoria de log está habilitada
export function isCategoryEnabled(category: string, currentLevel: string): boolean {
  const categoryConfig = logCategories[category as keyof typeof logCategories];
  if (!categoryConfig) return true;
  
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(currentLevel);
  const categoryLevelIndex = levels.indexOf(categoryConfig.level);
  
  return categoryLevelIndex >= currentLevelIndex;
}