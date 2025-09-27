// Feed Error Manager - Sistema de tratamento de erros específicos por feed
import { FeedError } from './freshrss';
import { newsDatabase } from './database';
import { diversityConfig } from './config';

export interface FeedErrorManager {
  logFeedError(feedId: string, error: FeedError): void;
  getFeedErrors(feedId?: string): FeedError[];
  getFeedErrorStats(feedId: string): FeedErrorStats;
  isQuarantined(feedId: string): boolean;
  quarantineFeed(feedId: string, reason: string): void;
  releaseFromQuarantine(feedId: string): void;
  getQuarantinedFeeds(): QuarantinedFeed[];
  shouldRetryFeed(feedId: string): boolean;
  getRetryDelay(feedId: string): number;
  clearFeedErrors(feedId: string): void;
}

export interface FeedErrorStats {
  feedId: string;
  feedName: string;
  totalErrors: number;
  recentErrors: number;
  errorRate: number;
  lastError?: FeedError;
  firstError?: FeedError;
  errorTypes: Record<string, number>;
  consecutiveFailures: number;
  lastSuccessfulFetch: number;
  isHealthy: boolean;
  healthScore: number;
}

export interface QuarantinedFeed {
  feedId: string;
  feedName: string;
  quarantineReason: string;
  quarantineTime: number;
  releaseTime: number;
  errorCount: number;
  canRetry: boolean;
}

export interface FeedRecoveryPlan {
  feedId: string;
  feedName: string;
  recoveryStrategy: 'immediate' | 'delayed' | 'manual' | 'disabled';
  nextRetryTime: number;
  retryCount: number;
  maxRetries: number;
  backoffMultiplier: number;
  estimatedRecoveryTime: number;
}

class FeedErrorManagerImpl implements FeedErrorManager {
  private readonly ERROR_LOG_KEY = 'pablo-magazine-feed-errors';
  private readonly QUARANTINE_KEY = 'pablo-magazine-quarantined-feeds';
  private readonly MAX_ERROR_LOG_SIZE = diversityConfig.errorManagement.maxErrorLogSize;
  private readonly QUARANTINE_DURATION = diversityConfig.errorManagement.quarantineDuration;
  private readonly MAX_CONSECUTIVE_FAILURES = diversityConfig.errorManagement.maxConsecutiveFailures;
  private readonly ERROR_RATE_THRESHOLD = diversityConfig.errorManagement.errorRateThreshold;
  private readonly HEALTH_CHECK_WINDOW = 24 * 60 * 60 * 1000; // 24 horas

  logFeedError(feedId: string, error: FeedError): void {
    const errors = this.getAllErrors();
    
    // Adicionar timestamp se não existir
    const enhancedError: FeedError = {
      ...error,
      timestamp: error.timestamp || Date.now(),
      retryCount: error.retryCount || 0
    };

    errors.push(enhancedError);

    // Manter apenas os últimos erros
    if (errors.length > this.MAX_ERROR_LOG_SIZE) {
      errors.splice(0, errors.length - this.MAX_ERROR_LOG_SIZE);
    }

    this.saveErrors(errors);

    // Verificar se o feed deve ser colocado em quarentena
    this.checkForQuarantine(feedId);

    console.error(`Feed Error [${feedId}]: ${error.errorMessage}`, {
      type: error.errorType,
      strategy: error.strategy,
      retryCount: error.retryCount
    });
  }

  getFeedErrors(feedId?: string): FeedError[] {
    const allErrors = this.getAllErrors();
    
    if (feedId) {
      return allErrors.filter(error => error.feedId === feedId);
    }
    
    return allErrors;
  }

  getFeedErrorStats(feedId: string): FeedErrorStats {
    const feedErrors = this.getFeedErrors(feedId);
    const recentErrors = this.getRecentErrors(feedId);
    
    if (feedErrors.length === 0) {
      return {
        feedId,
        feedName: `Feed ${feedId}`,
        totalErrors: 0,
        recentErrors: 0,
        errorRate: 0,
        errorTypes: {},
        consecutiveFailures: 0,
        lastSuccessfulFetch: 0,
        isHealthy: true,
        healthScore: 1.0
      };
    }

    // Calcular estatísticas
    const totalErrors = feedErrors.length;
    const recentErrorCount = recentErrors.length;
    const lastError = feedErrors[feedErrors.length - 1];
    const firstError = feedErrors[0];

    // Contar tipos de erro
    const errorTypes: Record<string, number> = {};
    feedErrors.forEach(error => {
      errorTypes[error.errorType] = (errorTypes[error.errorType] || 0) + 1;
    });

    // Calcular falhas consecutivas
    const consecutiveFailures = this.calculateConsecutiveFailures(feedId);

    // Calcular taxa de erro (baseada nas últimas 24 horas)
    const errorRate = this.calculateErrorRate(feedId);

    // Calcular score de saúde
    const healthScore = this.calculateHealthScore(feedId);

    return {
      feedId,
      feedName: lastError.feedName,
      totalErrors,
      recentErrors: recentErrorCount,
      errorRate,
      lastError,
      firstError,
      errorTypes,
      consecutiveFailures,
      lastSuccessfulFetch: this.getLastSuccessfulFetch(feedId),
      isHealthy: healthScore > 0.5 && consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES,
      healthScore
    };
  }

  isQuarantined(feedId: string): boolean {
    const quarantinedFeeds = this.getQuarantinedFeeds();
    const quarantinedFeed = quarantinedFeeds.find(feed => feed.feedId === feedId);
    
    if (!quarantinedFeed) return false;
    
    // Verificar se ainda está em quarentena
    const now = Date.now();
    if (now >= quarantinedFeed.releaseTime) {
      this.releaseFromQuarantine(feedId);
      return false;
    }
    
    return true;
  }

  quarantineFeed(feedId: string, reason: string): void {
    const quarantinedFeeds = this.getQuarantinedFeeds();
    const existingIndex = quarantinedFeeds.findIndex(feed => feed.feedId === feedId);
    
    const stats = this.getFeedErrorStats(feedId);
    const quarantinedFeed: QuarantinedFeed = {
      feedId,
      feedName: stats.feedName,
      quarantineReason: reason,
      quarantineTime: Date.now(),
      releaseTime: Date.now() + this.QUARANTINE_DURATION,
      errorCount: stats.totalErrors,
      canRetry: false
    };

    if (existingIndex >= 0) {
      quarantinedFeeds[existingIndex] = quarantinedFeed;
    } else {
      quarantinedFeeds.push(quarantinedFeed);
    }

    this.saveQuarantinedFeeds(quarantinedFeeds);
    
    console.warn(`Feed ${feedId} colocado em quarentena: ${reason}`);
  }

  releaseFromQuarantine(feedId: string): void {
    const quarantinedFeeds = this.getQuarantinedFeeds();
    const filteredFeeds = quarantinedFeeds.filter(feed => feed.feedId !== feedId);
    
    this.saveQuarantinedFeeds(filteredFeeds);
    
    console.log(`Feed ${feedId} liberado da quarentena`);
  }

  getQuarantinedFeeds(): QuarantinedFeed[] {
    const data = localStorage.getItem(this.QUARANTINE_KEY);
    return data ? JSON.parse(data) : [];
  }

  shouldRetryFeed(feedId: string): boolean {
    // Não tentar se estiver em quarentena
    if (this.isQuarantined(feedId)) {
      return false;
    }

    const stats = this.getFeedErrorStats(feedId);
    
    // Não tentar se muitas falhas consecutivas
    if (stats.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return false;
    }

    // Não tentar se taxa de erro muito alta
    if (stats.errorRate > this.ERROR_RATE_THRESHOLD) {
      return false;
    }

    return true;
  }

  getRetryDelay(feedId: string): number {
    const stats = this.getFeedErrorStats(feedId);
    const baseDelay = 5000; // 5 segundos
    const maxDelay = 300000; // 5 minutos
    
    // Backoff exponencial baseado em falhas consecutivas
    const delay = Math.min(
      baseDelay * Math.pow(2, stats.consecutiveFailures),
      maxDelay
    );

    return delay;
  }

  clearFeedErrors(feedId: string): void {
    const allErrors = this.getAllErrors();
    const filteredErrors = allErrors.filter(error => error.feedId !== feedId);
    
    this.saveErrors(filteredErrors);
    
    // Também remover da quarentena se estiver
    this.releaseFromQuarantine(feedId);
    
    console.log(`Erros do feed ${feedId} foram limpos`);
  }

  // Métodos para recuperação automática
  getRecoveryPlan(feedId: string): FeedRecoveryPlan {
    const stats = this.getFeedErrorStats(feedId);
    const isQuarantined = this.isQuarantined(feedId);
    
    let recoveryStrategy: FeedRecoveryPlan['recoveryStrategy'] = 'immediate';
    let nextRetryTime = Date.now();
    let maxRetries = 3;

    if (isQuarantined) {
      recoveryStrategy = 'manual';
      const quarantinedFeed = this.getQuarantinedFeeds().find(f => f.feedId === feedId);
      nextRetryTime = quarantinedFeed?.releaseTime || Date.now() + this.QUARANTINE_DURATION;
    } else if (stats.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      recoveryStrategy = 'disabled';
      nextRetryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
    } else if (stats.errorRate > 0.5) {
      recoveryStrategy = 'delayed';
      nextRetryTime = Date.now() + this.getRetryDelay(feedId);
      maxRetries = 1;
    }

    return {
      feedId,
      feedName: stats.feedName,
      recoveryStrategy,
      nextRetryTime,
      retryCount: stats.consecutiveFailures,
      maxRetries,
      backoffMultiplier: 2,
      estimatedRecoveryTime: nextRetryTime
    };
  }

  // Método para recuperação automática de feeds
  async attemptFeedRecovery(feedId: string): Promise<{ success: boolean; error?: string }> {
    const recoveryPlan = this.getRecoveryPlan(feedId);
    
    if (recoveryPlan.recoveryStrategy === 'disabled') {
      return { success: false, error: 'Feed desabilitado devido a muitos erros' };
    }

    if (recoveryPlan.recoveryStrategy === 'manual') {
      return { success: false, error: 'Feed em quarentena - recuperação manual necessária' };
    }

    if (Date.now() < recoveryPlan.nextRetryTime) {
      return { success: false, error: 'Ainda não é hora de tentar novamente' };
    }

    try {
      // Aqui seria implementada a lógica de teste do feed
      // Por enquanto, vamos simular um teste básico
      console.log(`Tentando recuperar feed ${feedId}...`);
      
      // Se chegou até aqui, considerar como sucesso
      this.clearFeedErrors(feedId);
      return { success: true };
      
    } catch (error) {
      const feedError: FeedError = {
        feedId,
        feedName: recoveryPlan.feedName,
        errorType: 'api',
        errorMessage: error instanceof Error ? error.message : 'Recovery attempt failed',
        timestamp: Date.now(),
        strategy: 'recovery-attempt',
        retryCount: recoveryPlan.retryCount + 1
      };
      
      this.logFeedError(feedId, feedError);
      return { success: false, error: feedError.errorMessage };
    }
  }

  // Métodos privados
  private getAllErrors(): FeedError[] {
    const data = localStorage.getItem(this.ERROR_LOG_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveErrors(errors: FeedError[]): void {
    localStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(errors));
  }

  private saveQuarantinedFeeds(feeds: QuarantinedFeed[]): void {
    localStorage.setItem(this.QUARANTINE_KEY, JSON.stringify(feeds));
  }

  private getRecentErrors(feedId: string, windowMs: number = this.HEALTH_CHECK_WINDOW): FeedError[] {
    const cutoffTime = Date.now() - windowMs;
    return this.getFeedErrors(feedId).filter(error => error.timestamp >= cutoffTime);
  }

  private calculateConsecutiveFailures(feedId: string): number {
    const errors = this.getFeedErrors(feedId);
    if (errors.length === 0) return 0;

    // Contar falhas consecutivas a partir do erro mais recente
    let consecutive = 0;
    for (let i = errors.length - 1; i >= 0; i--) {
      consecutive++;
      // Se encontrar um sucesso (isso seria implementado com logs de sucesso), parar
      // Por enquanto, assumir que todos são falhas consecutivas
    }

    return Math.min(consecutive, errors.length);
  }

  private calculateErrorRate(feedId: string): number {
    const recentErrors = this.getRecentErrors(feedId);
    if (recentErrors.length === 0) return 0;

    // Calcular taxa baseada no número de tentativas vs erros
    // Por simplicidade, assumir que cada erro representa uma tentativa falhada
    const totalAttempts = Math.max(recentErrors.length, 1);
    return recentErrors.length / totalAttempts;
  }

  private calculateHealthScore(feedId: string): number {
    const stats = this.getFeedErrorStats(feedId);
    const recentErrors = this.getRecentErrors(feedId);
    
    if (recentErrors.length === 0) return 1.0;

    // Fatores que afetam a saúde
    const errorRatePenalty = stats.errorRate * 0.5;
    const consecutiveFailuresPenalty = Math.min(stats.consecutiveFailures / this.MAX_CONSECUTIVE_FAILURES, 1) * 0.3;
    const recentErrorsPenalty = Math.min(recentErrors.length / 10, 1) * 0.2;

    const healthScore = Math.max(0, 1 - (errorRatePenalty + consecutiveFailuresPenalty + recentErrorsPenalty));
    
    return healthScore;
  }

  private getLastSuccessfulFetch(feedId: string): number {
    // Isso seria implementado com logs de sucesso
    // Por enquanto, retornar 0 se há erros recentes
    const recentErrors = this.getRecentErrors(feedId, 60 * 60 * 1000); // 1 hora
    return recentErrors.length > 0 ? 0 : Date.now() - (60 * 60 * 1000);
  }

  private checkForQuarantine(feedId: string): void {
    const stats = this.getFeedErrorStats(feedId);
    
    // Critérios para quarentena
    const shouldQuarantine = 
      stats.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES ||
      stats.errorRate > this.ERROR_RATE_THRESHOLD ||
      stats.recentErrors > 10;

    if (shouldQuarantine && !this.isQuarantined(feedId)) {
      const reason = `Muitos erros: ${stats.consecutiveFailures} falhas consecutivas, ${(stats.errorRate * 100).toFixed(1)}% taxa de erro`;
      this.quarantineFeed(feedId, reason);
    }
  }
}

// Instância singleton do Feed Error Manager
export const feedErrorManager = new FeedErrorManagerImpl();