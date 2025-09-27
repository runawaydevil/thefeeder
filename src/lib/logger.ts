// Sistema de logging estruturado para diversidade de feeds
import { diversityConfig } from './config';
import { getEnvironmentConfig, performanceThresholds } from './loggingConfig';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  feedId?: string;
  strategy?: string;
  executionTime?: number;
  diversityScore?: number;
  phase?: string; // Para rastrear fases do processo de recuperação
  correlationId?: string; // Para correlacionar logs relacionados
  userId?: string; // Para auditoria
  sessionId?: string; // Para rastrear sessões
}

export interface LoggerConfig {
  level: LogLevel;
  maxEntries: number;
  enableConsole: boolean;
  enableStorage: boolean;
  categories: string[];
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  strategy?: string; // Para métricas específicas de estratégia
  feedId?: string; // Para métricas específicas de feed
  phase?: string; // Para métricas de fases específicas
  correlationId?: string; // Para correlacionar métricas relacionadas
}

// Interface para auditoria de mudanças na saúde dos feeds
export interface FeedHealthAuditEntry {
  timestamp: number;
  feedId: string;
  feedName: string;
  previousStatus: 'active' | 'inactive' | 'error' | 'quarantined';
  newStatus: 'active' | 'inactive' | 'error' | 'quarantined';
  reason: string;
  metadata?: {
    errorCount?: number;
    lastSuccessfulFetch?: number;
    articleCount?: number;
    strategy?: string;
  };
  correlationId?: string;
}

// Interface para alertas configuráveis
export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  timeWindow: number; // em milissegundos
  enabled: boolean;
  severity: 'info' | 'warning' | 'critical';
  actions: AlertAction[];
}

export interface AlertCondition {
  type: 'diversity_score' | 'feed_health' | 'error_rate' | 'performance' | 'feed_count';
  operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  field?: string; // campo específico para verificar
}

export interface AlertAction {
  type: 'log' | 'console' | 'storage' | 'callback';
  config?: unknown;
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: unknown;
  acknowledged: boolean;
  correlationId?: string;
}

class LoggerImpl {
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private feedHealthAudit: FeedHealthAuditEntry[] = [];
  private alertRules: AlertRule[] = [];
  private activeAlerts: Alert[] = [];
  private readonly STORAGE_KEY = 'pablo-magazine-logs';
  private readonly METRICS_KEY = 'pablo-magazine-metrics';
  private readonly AUDIT_KEY = 'pablo-magazine-audit';
  private readonly ALERTS_KEY = 'pablo-magazine-alerts';
  private readonly ALERT_RULES_KEY = 'pablo-magazine-alert-rules';
  
  private config: LoggerConfig = {
    level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
    maxEntries: parseInt(import.meta.env.VITE_MAX_LOG_ENTRIES) || 1000,
    enableConsole: import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false',
    enableStorage: import.meta.env.VITE_ENABLE_STORAGE_LOGS !== 'false',
    categories: ['sync', 'diversity', 'feeds', 'performance', 'errors', 'audit', 'alerts', 'recovery']
  };

  // Gerador de IDs de correlação únicos
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  log(level: LogLevel, category: string, message: string, data?: unknown, metadata?: Partial<LogEntry>): void {
    // Verificar se deve logar baseado no nível
    if (this.levelPriority[level] < this.levelPriority[this.config.level]) {
      return;
    }

    // Verificar se categoria está habilitada
    if (!this.config.categories.includes(category)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      ...metadata
    };

    // Adicionar ao array de logs
    this.logs.push(logEntry);

    // Manter apenas os últimos logs
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Log no console se habilitado
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Salvar no storage se habilitado
    if (this.config.enableStorage) {
      this.saveToStorage();
    }
  }

  debug(category: string, message: string, data?: unknown, metadata?: Partial<LogEntry>): void {
    this.log('debug', category, message, data, metadata);
  }

  info(category: string, message: string, data?: unknown, metadata?: Partial<LogEntry>): void {
    this.log('info', category, message, data, metadata);
  }

  warn(category: string, message: string, data?: unknown, metadata?: Partial<LogEntry>): void {
    this.log('warn', category, message, data, metadata);
  }

  error(category: string, message: string, data?: unknown, metadata?: Partial<LogEntry>): void {
    this.log('error', category, message, data, metadata);
  }

  // Logging específico para diversidade
  logDiversityEvent(event: string, data: {
    feedsFound?: number;
    articlesCount?: number;
    diversityScore?: number;
    strategy?: string;
    executionTime?: number;
  }): void {
    this.info('diversity', event, data, {
      feedId: 'system',
      strategy: data.strategy,
      executionTime: data.executionTime,
      diversityScore: data.diversityScore
    });
  }

  // Logging específico para feeds
  logFeedEvent(feedId: string, feedName: string, event: string, data?: unknown): void {
    this.info('feeds', `[${feedName}] ${event}`, data, { feedId });
  }

  // Logging específico para sync
  logSyncEvent(event: string, data: {
    articlesProcessed?: number;
    newArticles?: number;
    feedsProcessed?: number;
    diversityScore?: number;
    executionTime?: number;
    strategy?: string;
  }): void {
    this.info('sync', event, data, {
      strategy: data.strategy,
      executionTime: data.executionTime,
      diversityScore: data.diversityScore
    });
  }

  // Logging estruturado para processo de recuperação
  logRecoveryPhase(phase: string, data: {
    correlationId?: string;
    strategy?: string;
    feedId?: string;
    feedName?: string;
    articlesFound?: number;
    executionTime?: number;
    success?: boolean;
    error?: string;
    metadata?: unknown;
  }): void {
    const correlationId = data.correlationId || this.generateCorrelationId();
    
    this.info('recovery', `[${phase}] ${data.success ? 'SUCCESS' : 'ATTEMPT'}`, {
      ...data,
      phase
    }, {
      correlationId,
      strategy: data.strategy,
      feedId: data.feedId,
      executionTime: data.executionTime,
      phase
    });

    // Se houve erro, logar também como warning
    if (data.error) {
      this.warn('recovery', `[${phase}] ERROR: ${data.error}`, data, {
        correlationId,
        strategy: data.strategy,
        feedId: data.feedId,
        phase
      });
    }
  }

  // Logging para início de processo de recuperação
  startRecoveryProcess(strategy: string, options: unknown): string {
    const correlationId = this.generateCorrelationId();
    
    this.info('recovery', `Starting recovery process with strategy: ${strategy}`, {
      strategy,
      options,
      correlationId
    }, {
      correlationId,
      strategy,
      phase: 'start'
    });

    return correlationId;
  }

  // Logging para fim de processo de recuperação
  endRecoveryProcess(correlationId: string, result: {
    success: boolean;
    strategy: string;
    articlesFound: number;
    feedsProcessed: number;
    executionTime: number;
    diversityScore?: number;
    errors?: string[];
  }): void {
    const level = result.success ? 'info' : 'warn';
    
    this.log(level, 'recovery', `Recovery process completed: ${result.success ? 'SUCCESS' : 'FAILED'}`, {
      ...result,
      correlationId
    }, {
      correlationId,
      strategy: result.strategy,
      executionTime: result.executionTime,
      diversityScore: result.diversityScore,
      phase: 'end'
    });
  }

  // Métricas de performance
  recordMetric(name: string, value: number, unit: string, category: string, threshold?: number, metadata?: {
    strategy?: string;
    feedId?: string;
    phase?: string;
    correlationId?: string;
  }): void {
    let status: 'good' | 'warning' | 'critical' = 'good';
    
    if (threshold) {
      if (value > threshold * 1.5) {
        status = 'critical';
      } else if (value > threshold) {
        status = 'warning';
      }
    }

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
      threshold,
      status,
      strategy: metadata?.strategy,
      feedId: metadata?.feedId,
      phase: metadata?.phase,
      correlationId: metadata?.correlationId
    };

    this.performanceMetrics.push(metric);

    // Manter apenas as últimas 1000 métricas (aumentado para suportar mais dados)
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Log crítico se necessário
    if (status === 'critical') {
      this.warn('performance', `Métrica crítica: ${name} = ${value}${unit}`, { 
        threshold, 
        status,
        ...metadata 
      }, {
        strategy: metadata?.strategy,
        feedId: metadata?.feedId,
        correlationId: metadata?.correlationId
      });
    }

    // Verificar alertas baseados em métricas
    this.checkMetricAlerts(metric);
  }

  // Métricas específicas por estratégia de recuperação
  recordStrategyMetric(strategy: string, metricName: string, value: number, unit: string, correlationId?: string): void {
    const fullMetricName = `strategy_${metricName}`;
    const threshold = this.getConfiguredThreshold(fullMetricName) || this.getConfiguredThreshold(metricName);

    this.recordMetric(
      fullMetricName,
      value,
      unit,
      'strategy_performance',
      threshold,
      {
        strategy,
        correlationId,
        phase: 'execution'
      }
    );
  }

  // Métricas específicas por feed
  recordFeedMetric(feedId: string, feedName: string, metricName: string, value: number, unit: string, correlationId?: string): void {
    const fullMetricName = `feed_${metricName}`;
    const threshold = this.getConfiguredThreshold(fullMetricName) || this.getConfiguredThreshold(metricName);

    this.recordMetric(
      fullMetricName,
      value,
      unit,
      'feed_performance',
      threshold,
      {
        feedId,
        correlationId,
        phase: 'feed_processing'
      }
    );

    // Log específico do feed
    this.logFeedEvent(feedId, feedName, `Metric recorded: ${metricName} = ${value}${unit}`, {
      metricName,
      value,
      unit,
      correlationId
    });
  }

  // Obter logs filtrados
  getLogs(filters?: {
    level?: LogLevel;
    category?: string;
    feedId?: string;
    strategy?: string;
    since?: number;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.level) {
        const minPriority = this.levelPriority[filters.level];
        filteredLogs = filteredLogs.filter(log => this.levelPriority[log.level] >= minPriority);
      }

      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }

      if (filters.feedId) {
        filteredLogs = filteredLogs.filter(log => log.feedId === filters.feedId);
      }

      if (filters.strategy) {
        filteredLogs = filteredLogs.filter(log => log.strategy === filters.strategy);
      }

      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since!);
      }

      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Obter métricas de performance
  getMetrics(filters?: {
    category?: string;
    name?: string;
    since?: number;
    status?: 'good' | 'warning' | 'critical';
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.performanceMetrics];

    if (filters) {
      if (filters.category) {
        filteredMetrics = filteredMetrics.filter(metric => metric.category === filters.category);
      }

      if (filters.name) {
        filteredMetrics = filteredMetrics.filter(metric => metric.name === filters.name);
      }

      if (filters.since) {
        filteredMetrics = filteredMetrics.filter(metric => metric.timestamp >= filters.since!);
      }

      if (filters.status) {
        filteredMetrics = filteredMetrics.filter(metric => metric.status === filters.status);
      }
    }

    return filteredMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Obter resumo de logs por categoria
  getLogSummary(): Record<string, { count: number; lastEntry: number; levels: Record<LogLevel, number> }> {
    const summary: Record<string, { count: number; lastEntry: number; levels: Record<LogLevel, number> }> = {};

    this.logs.forEach(log => {
      if (!summary[log.category]) {
        summary[log.category] = {
          count: 0,
          lastEntry: 0,
          levels: { debug: 0, info: 0, warn: 0, error: 0 }
        };
      }

      summary[log.category].count++;
      summary[log.category].lastEntry = Math.max(summary[log.category].lastEntry, log.timestamp);
      summary[log.category].levels[log.level]++;
    });

    return summary;
  }

  // Obter alertas críticos
  getCriticalAlerts(): LogEntry[] {
    const recentTime = Date.now() - (60 * 60 * 1000); // Última hora
    
    return this.logs.filter(log => 
      log.level === 'error' && 
      log.timestamp >= recentTime
    );
  }

  // Obter métricas críticas
  getCriticalMetrics(): PerformanceMetric[] {
    const recentTime = Date.now() - (60 * 60 * 1000); // Última hora
    
    return this.performanceMetrics.filter(metric => 
      metric.status === 'critical' && 
      metric.timestamp >= recentTime
    );
  }

  // Auditoria de mudanças na saúde dos feeds
  auditFeedHealthChange(
    feedId: string,
    feedName: string,
    previousStatus: 'active' | 'inactive' | 'error' | 'quarantined',
    newStatus: 'active' | 'inactive' | 'error' | 'quarantined',
    reason: string,
    metadata?: {
      errorCount?: number;
      lastSuccessfulFetch?: number;
      articleCount?: number;
      strategy?: string;
    },
    correlationId?: string
  ): void {
    const auditEntry: FeedHealthAuditEntry = {
      timestamp: Date.now(),
      feedId,
      feedName,
      previousStatus,
      newStatus,
      reason,
      metadata,
      correlationId: correlationId || this.generateCorrelationId()
    };

    this.feedHealthAudit.push(auditEntry);

    // Manter apenas os últimos 500 registros de auditoria
    if (this.feedHealthAudit.length > 500) {
      this.feedHealthAudit = this.feedHealthAudit.slice(-500);
    }

    // Log da mudança
    const severity = this.getHealthChangeSeverity(previousStatus, newStatus);
    const message = `Feed health changed: ${feedName} (${feedId}) from ${previousStatus} to ${newStatus} - ${reason}`;
    
    this.log(severity, 'audit', message, {
      feedId,
      feedName,
      previousStatus,
      newStatus,
      reason,
      metadata
    }, {
      feedId,
      correlationId: auditEntry.correlationId
    });

    // Verificar se deve disparar alertas
    this.checkFeedHealthAlerts(auditEntry);

    // Salvar auditoria no storage
    this.saveAuditToStorage();
  }

  // Obter histórico de auditoria de um feed específico
  getFeedAuditHistory(feedId: string, limit?: number): FeedHealthAuditEntry[] {
    const feedAudits = this.feedHealthAudit
      .filter(audit => audit.feedId === feedId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return limit ? feedAudits.slice(0, limit) : feedAudits;
  }

  // Obter todas as mudanças de saúde recentes
  getRecentHealthChanges(timeWindow: number = 24 * 60 * 60 * 1000): FeedHealthAuditEntry[] {
    const cutoffTime = Date.now() - timeWindow;
    
    return this.feedHealthAudit
      .filter(audit => audit.timestamp >= cutoffTime)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private getHealthChangeSeverity(
    previousStatus: string, 
    newStatus: string
  ): LogLevel {
    // Mudanças críticas
    if (previousStatus === 'active' && (newStatus === 'error' || newStatus === 'quarantined')) {
      return 'error';
    }
    
    // Mudanças de warning
    if (previousStatus === 'active' && newStatus === 'inactive') {
      return 'warn';
    }
    
    // Mudanças positivas
    if ((previousStatus === 'error' || previousStatus === 'inactive' || previousStatus === 'quarantined') && newStatus === 'active') {
      return 'info';
    }
    
    // Outras mudanças
    return 'info';
  }

  // Sistema de alertas configuráveis
  addAlertRule(rule: AlertRule): void {
    // Verificar se já existe uma regra com o mesmo ID
    const existingIndex = this.alertRules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      this.alertRules[existingIndex] = rule;
    } else {
      this.alertRules.push(rule);
    }

    this.saveAlertRulesToStorage();
    
    this.info('alerts', `Alert rule ${existingIndex >= 0 ? 'updated' : 'added'}: ${rule.name}`, {
      ruleId: rule.id,
      condition: rule.condition,
      threshold: rule.threshold
    });
  }

  removeAlertRule(ruleId: string): boolean {
    const initialLength = this.alertRules.length;
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    
    if (this.alertRules.length < initialLength) {
      this.saveAlertRulesToStorage();
      this.info('alerts', `Alert rule removed: ${ruleId}`);
      return true;
    }
    
    return false;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // Verificar alertas baseados em métricas
  private checkMetricAlerts(metric: PerformanceMetric): void {
    const applicableRules = this.alertRules.filter(rule => 
      rule.enabled && 
      (rule.condition.type === 'performance' || 
       (rule.condition.type === 'diversity_score' && metric.name.includes('diversity')) ||
       (rule.condition.type === 'error_rate' && metric.name.includes('error')))
    );

    for (const rule of applicableRules) {
      if (this.evaluateMetricCondition(rule, metric)) {
        this.triggerAlert(rule, {
          metric,
          message: `Metric alert: ${metric.name} = ${metric.value}${metric.unit}`,
          correlationId: metric.correlationId
        });
      }
    }
  }

  // Verificar alertas baseados em mudanças de saúde dos feeds
  private checkFeedHealthAlerts(auditEntry: FeedHealthAuditEntry): void {
    const applicableRules = this.alertRules.filter(rule => 
      rule.enabled && rule.condition.type === 'feed_health'
    );

    for (const rule of applicableRules) {
      if (this.evaluateFeedHealthCondition(rule, auditEntry)) {
        this.triggerAlert(rule, {
          auditEntry,
          message: `Feed health alert: ${auditEntry.feedName} changed from ${auditEntry.previousStatus} to ${auditEntry.newStatus}`,
          correlationId: auditEntry.correlationId
        });
      }
    }
  }

  // Verificar alertas de diversidade
  checkDiversityAlerts(diversityScore: number, feedCount: number, correlationId?: string): void {
    const applicableRules = this.alertRules.filter(rule => 
      rule.enabled && 
      (rule.condition.type === 'diversity_score' || rule.condition.type === 'feed_count')
    );

    for (const rule of applicableRules) {
      let shouldTrigger = false;
      let value = 0;
      let message = '';

      if (rule.condition.type === 'diversity_score') {
        value = diversityScore;
        shouldTrigger = this.evaluateCondition(rule.condition.operator, value, rule.threshold);
        message = `Diversity score alert: ${(value * 100).toFixed(1)}% (threshold: ${(rule.threshold * 100).toFixed(1)}%)`;
      } else if (rule.condition.type === 'feed_count') {
        value = feedCount;
        shouldTrigger = this.evaluateCondition(rule.condition.operator, value, rule.threshold);
        message = `Feed count alert: ${value} feeds (threshold: ${rule.threshold})`;
      }

      if (shouldTrigger) {
        this.triggerAlert(rule, {
          diversityScore,
          feedCount,
          message,
          correlationId
        });
      }
    }
  }

  private evaluateMetricCondition(rule: AlertRule, metric: PerformanceMetric): boolean {
    return this.evaluateCondition(rule.condition.operator, metric.value, rule.threshold);
  }

  private evaluateFeedHealthCondition(rule: AlertRule, auditEntry: FeedHealthAuditEntry): boolean {
    // Para alertas de saúde de feed, consideramos mudanças para status problemáticos
    return auditEntry.newStatus === 'error' || auditEntry.newStatus === 'quarantined';
  }

  private evaluateCondition(operator: string, value: number, threshold: number): boolean {
    switch (operator) {
      case 'lt': return value < threshold;
      case 'gt': return value > threshold;
      case 'eq': return value === threshold;
      case 'lte': return value <= threshold;
      case 'gte': return value >= threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, data: {
    message: string;
    correlationId?: string;
    [key: string]: unknown;
  }): void {
    // Verificar se já existe um alerta similar recente para evitar spam
    const recentTime = Date.now() - rule.timeWindow;
    const recentSimilarAlert = this.activeAlerts.find(alert => 
      alert.ruleId === rule.id && 
      alert.timestamp >= recentTime &&
      !alert.acknowledged
    );

    if (recentSimilarAlert) {
      return; // Evitar spam de alertas
    }

    const alert: Alert = {
      id: this.generateCorrelationId(),
      ruleId: rule.id,
      timestamp: Date.now(),
      severity: rule.severity,
      message: data.message,
      data,
      acknowledged: false,
      correlationId: data.correlationId
    };

    this.activeAlerts.push(alert);

    // Manter apenas os últimos 200 alertas
    if (this.activeAlerts.length > 200) {
      this.activeAlerts = this.activeAlerts.slice(-200);
    }

    // Executar ações do alerta
    for (const action of rule.actions) {
      this.executeAlertAction(action, alert, rule);
    }

    // Log do alerta
    this.log(rule.severity === 'critical' ? 'error' : rule.severity === 'warning' ? 'warn' : 'info', 
             'alerts', 
             `ALERT: ${rule.name} - ${data.message}`, 
             data, 
             { correlationId: data.correlationId });

    this.saveAlertsToStorage();
  }

  private executeAlertAction(action: AlertAction, alert: Alert, rule: AlertRule): void {
    try {
      switch (action.type) {
        case 'log':
          // Já logado acima
          break;
        case 'console':
          console.warn(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${alert.message}`);
          break;
        case 'storage':
          // Já salvo no storage
          break;
        case 'callback':
          if (typeof action.config === 'function') {
            (action.config as Function)(alert, rule);
          }
          break;
      }
    } catch (error) {
      this.error('alerts', `Failed to execute alert action: ${action.type}`, { error, alert, rule });
    }
  }

  // Obter alertas ativos
  getActiveAlerts(severity?: 'info' | 'warning' | 'critical'): Alert[] {
    let alerts = this.activeAlerts.filter(alert => !alert.acknowledged);
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Reconhecer alerta
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.acknowledged = true;
      this.saveAlertsToStorage();
      this.info('alerts', `Alert acknowledged: ${alertId}`);
      return true;
    }
    
    return false;
  }

  // Limpar alertas antigos
  clearOldAlerts(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAge;
    const initialCount = this.activeAlerts.length;
    
    this.activeAlerts = this.activeAlerts.filter(alert => 
      alert.timestamp >= cutoffTime || !alert.acknowledged
    );
    
    const cleared = initialCount - this.activeAlerts.length;
    
    if (cleared > 0) {
      this.saveAlertsToStorage();
      this.info('alerts', `Cleared ${cleared} old alerts`);
    }
    
    return cleared;
  }

  // Gerar relatório de saúde do sistema
  getSystemHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
    lastUpdate: number;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const recentTime = Date.now() - (60 * 60 * 1000); // Última hora
    const recentLogs = this.logs.filter(log => log.timestamp >= recentTime);
    const recentMetrics = this.performanceMetrics.filter(metric => metric.timestamp >= recentTime);

    const errorCount = recentLogs.filter(log => log.level === 'error').length;
    const warnCount = recentLogs.filter(log => log.level === 'warn').length;
    const criticalMetrics = recentMetrics.filter(metric => metric.status === 'critical').length;
    const warningMetrics = recentMetrics.filter(metric => metric.status === 'warning').length;

    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let score = 100;

    // Analisar erros
    if (errorCount > 10) {
      issues.push(`Muitos erros na última hora: ${errorCount}`);
      recommendations.push('Investigar causas dos erros recorrentes');
      status = 'critical';
      score -= 30;
    } else if (errorCount > 5) {
      issues.push(`Alguns erros na última hora: ${errorCount}`);
      recommendations.push('Monitorar erros de perto');
      status = 'warning';
      score -= 15;
    }

    // Analisar warnings
    if (warnCount > 20) {
      issues.push(`Muitos warnings na última hora: ${warnCount}`);
      recommendations.push('Revisar configurações do sistema');
      if (status !== 'critical') status = 'warning';
      score -= 10;
    }

    // Analisar métricas críticas
    if (criticalMetrics > 5) {
      issues.push(`Métricas críticas: ${criticalMetrics}`);
      recommendations.push('Otimizar performance do sistema');
      status = 'critical';
      score -= 25;
    } else if (warningMetrics > 10) {
      issues.push(`Métricas em warning: ${warningMetrics}`);
      recommendations.push('Considerar ajustes de configuração');
      if (status !== 'critical') status = 'warning';
      score -= 10;
    }

    if (issues.length === 0) {
      recommendations.push('Sistema funcionando normalmente');
    }

    // Incluir informações de alertas
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = this.getActiveAlerts('critical');

    if (criticalAlerts.length > 0) {
      status = 'critical';
      score -= 20;
      issues.push(`${criticalAlerts.length} alertas críticos ativos`);
    }

    if (activeAlerts.length > 5) {
      if (status !== 'critical') status = 'warning';
      score -= 10;
      issues.push(`Muitos alertas ativos: ${activeAlerts.length}`);
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
      lastUpdate: Date.now(),
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length
    };
  }

  // Métodos privados
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    let logMessage = `${prefix} ${entry.message}`;
    
    if (entry.feedId) {
      logMessage += ` (Feed: ${entry.feedId})`;
    }
    
    if (entry.strategy) {
      logMessage += ` (Strategy: ${entry.strategy})`;
    }

    switch (entry.level) {
      case 'debug':
        console.debug(logMessage, entry.data);
        break;
      case 'info':
        console.info(logMessage, entry.data);
        break;
      case 'warn':
        console.warn(logMessage, entry.data);
        break;
      case 'error':
        console.error(logMessage, entry.data);
        break;
    }
  }

  private saveToStorage(): void {
    try {
      // Salvar apenas os últimos 200 logs no storage para não sobrecarregar
      const logsToSave = this.logs.slice(-200);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logsToSave));
      
      // Salvar métricas também
      const metricsToSave = this.performanceMetrics.slice(-100);
      localStorage.setItem(this.METRICS_KEY, JSON.stringify(metricsToSave));
    } catch (error) {
      console.warn('Erro ao salvar logs no storage:', error);
    }
  }

  private saveAuditToStorage(): void {
    try {
      const auditToSave = this.feedHealthAudit.slice(-100);
      localStorage.setItem(this.AUDIT_KEY, JSON.stringify(auditToSave));
    } catch (error) {
      console.warn('Erro ao salvar auditoria no storage:', error);
    }
  }

  private saveAlertsToStorage(): void {
    try {
      const alertsToSave = this.activeAlerts.slice(-50);
      localStorage.setItem(this.ALERTS_KEY, JSON.stringify(alertsToSave));
    } catch (error) {
      console.warn('Erro ao salvar alertas no storage:', error);
    }
  }

  private saveAlertRulesToStorage(): void {
    try {
      localStorage.setItem(this.ALERT_RULES_KEY, JSON.stringify(this.alertRules));
    } catch (error) {
      console.warn('Erro ao salvar regras de alerta no storage:', error);
    }
  }

  // Carregar logs do storage
  loadFromStorage(): void {
    try {
      const savedLogs = localStorage.getItem(this.STORAGE_KEY);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }

      const savedMetrics = localStorage.getItem(this.METRICS_KEY);
      if (savedMetrics) {
        this.performanceMetrics = JSON.parse(savedMetrics);
      }

      const savedAudit = localStorage.getItem(this.AUDIT_KEY);
      if (savedAudit) {
        this.feedHealthAudit = JSON.parse(savedAudit);
      }

      const savedAlerts = localStorage.getItem(this.ALERTS_KEY);
      if (savedAlerts) {
        this.activeAlerts = JSON.parse(savedAlerts);
      }

      const savedAlertRules = localStorage.getItem(this.ALERT_RULES_KEY);
      if (savedAlertRules) {
        this.alertRules = JSON.parse(savedAlertRules);
      } else {
        // Inicializar com regras padrão se não existirem
        this.initializeDefaultAlertRules();
      }
    } catch (error) {
      console.warn('Erro ao carregar logs do storage:', error);
    }
  }

  // Inicializar regras de alerta padrão baseadas no ambiente
  private initializeDefaultAlertRules(): void {
    const envConfig = getEnvironmentConfig();
    this.alertRules = envConfig.alerts;
    this.saveAlertRulesToStorage();
  }

  // Obter threshold configurado para uma métrica
  private getConfiguredThreshold(metricName: string): number | undefined {
    return performanceThresholds[metricName as keyof typeof performanceThresholds];
  }

  // Configurar logger
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Limpar logs antigos
  cleanup(): number {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    this.performanceMetrics = this.performanceMetrics.filter(metric => metric.timestamp >= cutoffTime);
    this.feedHealthAudit = this.feedHealthAudit.filter(audit => audit.timestamp >= cutoffTime);
    
    // Limpar alertas antigos também
    const alertsCleaned = this.clearOldAlerts();
    
    const cleaned = initialCount - this.logs.length;
    if (cleaned > 0) {
      this.info('system', `Limpeza de logs: ${cleaned} entradas removidas, ${alertsCleaned} alertas limpos`);
    }
    
    return cleaned;
  }

  // Exportar logs para análise
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,level,category,message,feedId,strategy,executionTime,diversityScore';
      const rows = this.logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.category,
        `"${log.message.replace(/"/g, '""')}"`,
        log.feedId || '',
        log.strategy || '',
        log.executionTime || '',
        log.diversityScore || ''
      ].join(','));
      
      return [headers, ...rows].join('\n');
    } else {
      return JSON.stringify(this.logs, null, 2);
    }
  }

  // Obter estatísticas de logging
  getLoggingStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<string, number>;
    averageLogsPerHour: number;
    oldestLog: number;
    newestLog: number;
  } {
    const logsByLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    const logsByCategory: Record<string, number> = {};

    this.logs.forEach(log => {
      logsByLevel[log.level]++;
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
    });

    const oldestLog = this.logs.length > 0 ? Math.min(...this.logs.map(l => l.timestamp)) : 0;
    const newestLog = this.logs.length > 0 ? Math.max(...this.logs.map(l => l.timestamp)) : 0;
    const timeSpan = newestLog - oldestLog;
    const averageLogsPerHour = timeSpan > 0 ? (this.logs.length / (timeSpan / (60 * 60 * 1000))) : 0;

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByCategory,
      averageLogsPerHour,
      oldestLog,
      newestLog
    };
  }
}

// Instância singleton do logger
export const logger = new LoggerImpl();

// Carregar logs salvos na inicialização
logger.loadFromStorage();

// Limpeza automática a cada hora
setInterval(() => {
  logger.cleanup();
}, 60 * 60 * 1000);

// Funções de conveniência
export const logDiversity = (event: string, data: Parameters<typeof logger.logDiversityEvent>[1]) => 
  logger.logDiversityEvent(event, data);

export const logFeed = (feedId: string, feedName: string, event: string, data?: unknown) => 
  logger.logFeedEvent(feedId, feedName, event, data);

export const logSync = (event: string, data: Parameters<typeof logger.logSyncEvent>[1]) => 
  logger.logSyncEvent(event, data);

export const recordMetric = (name: string, value: number, unit: string, category: string, threshold?: number, metadata?: {
  strategy?: string;
  feedId?: string;
  phase?: string;
  correlationId?: string;
}) => logger.recordMetric(name, value, unit, category, threshold, metadata);

// Novas funções de conveniência para logging estruturado
export const startRecovery = (strategy: string, options: unknown) => 
  logger.startRecoveryProcess(strategy, options);

export const logRecovery = (phase: string, data: Parameters<typeof logger.logRecoveryPhase>[1]) => 
  logger.logRecoveryPhase(phase, data);

export const endRecovery = (correlationId: string, result: Parameters<typeof logger.endRecoveryProcess>[1]) => 
  logger.endRecoveryProcess(correlationId, result);

export const recordStrategyMetric = (strategy: string, metricName: string, value: number, unit: string, correlationId?: string) => 
  logger.recordStrategyMetric(strategy, metricName, value, unit, correlationId);

export const recordFeedMetric = (feedId: string, feedName: string, metricName: string, value: number, unit: string, correlationId?: string) => 
  logger.recordFeedMetric(feedId, feedName, metricName, value, unit, correlationId);

export const auditFeedHealth = (
  feedId: string,
  feedName: string,
  previousStatus: 'active' | 'inactive' | 'error' | 'quarantined',
  newStatus: 'active' | 'inactive' | 'error' | 'quarantined',
  reason: string,
  metadata?: Parameters<typeof logger.auditFeedHealthChange>[5],
  correlationId?: string
) => logger.auditFeedHealthChange(feedId, feedName, previousStatus, newStatus, reason, metadata, correlationId);

export const checkDiversityAlerts = (diversityScore: number, feedCount: number, correlationId?: string) => 
  logger.checkDiversityAlerts(diversityScore, feedCount, correlationId);

// Funções para gerenciamento de alertas
export const addAlert = (rule: AlertRule) => logger.addAlertRule(rule);
export const removeAlert = (ruleId: string) => logger.removeAlertRule(ruleId);
export const getAlerts = (severity?: 'info' | 'warning' | 'critical') => logger.getActiveAlerts(severity);
export const acknowledgeAlert = (alertId: string) => logger.acknowledgeAlert(alertId);