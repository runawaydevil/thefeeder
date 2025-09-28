import { freshRSSService } from './freshrss';
import { newsDatabase, StoredArticle, EnhancedSyncStatus, SyncError } from './database';
import { formatDate, calculateReadingTime, extractImageFromContent, stripHtml } from './freshrss';
import { feedDiversityManager, DiversityOptions } from './feedDiversityManager';
import { diversityValidator } from './diversityValidator';
import { diversityConfig } from './config';
import { strategyResultsCache, diversityMetricsCache } from './performanceCache';
import { 
  logger, 
  startRecovery, 
  logRecovery, 
  endRecovery, 
  recordMetric, 
  checkDiversityAlerts,
  auditFeedHealth 
} from './logger';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncTime: number = 0;
  private readonly SYNC_INTERVAL = diversityConfig.syncIntervalHours * 60 * 60 * 1000;
  
  // Configurações de diversidade (usando configuração centralizada)
  private readonly DIVERSITY_CONFIG = {
    limit: diversityConfig.syncArticleLimit,
    maxPerFeed: diversityConfig.maxArticlesPerFeed,
    minFeeds: diversityConfig.minFeedsRequired,
    strategies: ['multiple-feeds', 'time-window', 'category-based', 'bulk-retrieval']
  };

  constructor() {
    this.initializeSync();
  }

  private initializeSync() {
    // Verificar se já existe um último sync local
    const lastSync = newsDatabase.getSetting('lastSync');
    if (lastSync) {
      this.lastSyncTime = parseInt(lastSync);
    }

    // Verificar se precisa fazer sync global
    if (this.shouldPerformGlobalSync()) {
      // Fazer sync inicial após um pequeno delay para não bloquear a inicialização
      setTimeout(() => {
        this.performSync();
      }, 1000);
    } else {
      // Se não precisa fazer sync, carregar dados existentes
      console.log('🔄 Sync global recente encontrado, pulando sync inicial');
    }

    // Configurar sync automático
    this.startAutoSync();
  }

  // Verificar se precisa fazer sync global (compartilhado entre todos os usuários)
  private shouldPerformGlobalSync(): boolean {
    try {
      const globalSyncKey = `global-last-sync-${window.location.hostname}`;
      const lastGlobalSync = localStorage.getItem(globalSyncKey);
      
      if (!lastGlobalSync) {
        console.log('🔄 Primeiro sync global, iniciando...');
        return true;
      }
      
      const lastSyncTime = parseInt(lastGlobalSync);
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTime;
      
      if (timeSinceLastSync > this.SYNC_INTERVAL) {
        console.log(`🔄 Último sync global há ${Math.round(timeSinceLastSync / (1000 * 60))} minutos, iniciando novo sync...`);
        return true;
      }
      
      console.log(`⏰ Próximo sync global em ${Math.round((this.SYNC_INTERVAL - timeSinceLastSync) / (1000 * 60))} minutos`);
      return false;
    } catch (error) {
      console.warn('Erro ao verificar sync global, permitindo sync:', error);
      return true;
    }
  }

  // Atualizar timestamp do último sync global
  private updateGlobalSync(): void {
    try {
      const globalSyncKey = `global-last-sync-${window.location.hostname}`;
      localStorage.setItem(globalSyncKey, Date.now().toString());
      console.log('✅ Timestamp de sync global atualizado');
    } catch (error) {
      console.warn('Erro ao atualizar sync global:', error);
    }
  }

  private startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      // Verificar se precisa fazer sync antes de executar
      if (this.shouldPerformGlobalSync()) {
        this.performSync();
      }
    }, this.SYNC_INTERVAL);

    console.log(`⏰ Sync automático configurado para cada ${diversityConfig.syncIntervalHours} horas`);
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async performSync(): Promise<{ success: boolean; newArticles: number; error?: string; diversityScore?: number; feedsProcessed?: number }> {
    if (this.isSyncing) {
      logger.warn('sync', 'Sync já em andamento, ignorando...');
      return { success: false, newArticles: 0, error: 'Sync já em andamento' };
    }

    this.isSyncing = true;
    const syncStartTime = Date.now();
    const syncErrors: SyncError[] = [];

    // Iniciar processo de recuperação estruturado
    const correlationId = startRecovery('feed-diversity-manager', {
      limit: this.DIVERSITY_CONFIG.limit,
      maxPerFeed: this.DIVERSITY_CONFIG.maxPerFeed,
      minFeeds: this.DIVERSITY_CONFIG.minFeeds
    });

    try {
      logRecovery('sync_start', {
        correlationId,
        strategy: 'feed-diversity-manager',
        success: true
      });

      // Registrar métrica de início
      recordMetric('sync_started', 1, 'count', 'sync', undefined, {
        correlationId,
        phase: 'start'
      });
      
      // Obter status de saúde dos feeds
      logRecovery('feed_health_check', {
        correlationId,
        strategy: 'feed-diversity-manager',
        success: true
      });

      const feedHealthReport = await feedDiversityManager.getFeedHealthStatus();
      
      // Log estruturado do status dos feeds
      logger.info('sync', `Feed health status: ${feedHealthReport.activeFeeds}/${feedHealthReport.totalFeeds} active`, {
        activeFeeds: feedHealthReport.activeFeeds,
        totalFeeds: feedHealthReport.totalFeeds,
        diversityScore: feedHealthReport.diversityScore,
        failedFeeds: feedHealthReport.failedFeeds.length,
        correlationId
      });

      // Registrar métricas de saúde dos feeds
      recordMetric('active_feeds', feedHealthReport.activeFeeds, 'count', 'feed_health', this.DIVERSITY_CONFIG.minFeeds, {
        correlationId,
        phase: 'health_check'
      });

      recordMetric('feed_diversity_score', feedHealthReport.diversityScore, 'ratio', 'diversity', 0.4, {
        correlationId,
        phase: 'health_check'
      });

      // Verificar alertas de diversidade
      checkDiversityAlerts(feedHealthReport.diversityScore, feedHealthReport.activeFeeds, correlationId);

      // Verificar se temos feeds suficientes
      if (feedHealthReport.activeFeeds < this.DIVERSITY_CONFIG.minFeeds) {
        const warningMsg = `Apenas ${feedHealthReport.activeFeeds} feeds ativos, mínimo requerido: ${this.DIVERSITY_CONFIG.minFeeds}`;
        
        logRecovery('insufficient_feeds', {
          correlationId,
          strategy: 'feed-diversity-manager',
          success: false,
          error: warningMsg,
          metadata: {
            activeFeeds: feedHealthReport.activeFeeds,
            requiredFeeds: this.DIVERSITY_CONFIG.minFeeds
          }
        });
      }

      // Configurar opções de diversidade
      const diversityOptions: DiversityOptions = {
        limit: this.DIVERSITY_CONFIG.limit,
        maxPerFeed: this.DIVERSITY_CONFIG.maxPerFeed,
        minFeeds: this.DIVERSITY_CONFIG.minFeeds,
        strategies: this.DIVERSITY_CONFIG.strategies,
        timeoutMs: 30000
      };

      // Buscar artigos usando Feed Diversity Manager
      logRecovery('article_retrieval', {
        correlationId,
        strategy: 'feed-diversity-manager',
        success: true
      });

      const retrievalStartTime = Date.now();
      const freshArticles = await feedDiversityManager.getArticlesWithDiversity(diversityOptions);
      const retrievalTime = Date.now() - retrievalStartTime;

      // Registrar métricas de performance da recuperação
      recordMetric('article_retrieval_time', retrievalTime, 'ms', 'performance', 10000, {
        strategy: 'feed-diversity-manager',
        correlationId,
        phase: 'retrieval'
      });

      recordMetric('articles_retrieved', freshArticles?.length || 0, 'count', 'retrieval', 10, {
        strategy: 'feed-diversity-manager',
        correlationId,
        phase: 'retrieval'
      });

      logger.info('sync', `Feed Diversity Manager returned ${freshArticles?.length || 0} articles`, {
        articlesCount: freshArticles?.length || 0,
        retrievalTime,
        correlationId
      });

      // Validar diversidade mínima
      const feedsInResult = new Set(freshArticles.map(article => article.categories[0]));
      const diversityScore = this.calculateDiversityScore(freshArticles);
      
      // Log estruturado da diversidade
      logger.info('sync', `Diversity analysis: ${feedsInResult.size} feeds, ${(diversityScore * 100).toFixed(1)}% score`, {
        uniqueFeeds: feedsInResult.size,
        diversityScore,
        articlesAnalyzed: freshArticles.length,
        correlationId
      });

      // Registrar métricas de diversidade
      recordMetric('result_diversity_score', diversityScore, 'ratio', 'diversity', 0.4, {
        correlationId,
        phase: 'validation'
      });

      recordMetric('unique_feeds_in_result', feedsInResult.size, 'count', 'diversity', this.DIVERSITY_CONFIG.minFeeds, {
        correlationId,
        phase: 'validation'
      });

      // Verificar alertas de diversidade dos resultados
      checkDiversityAlerts(diversityScore, feedsInResult.size, correlationId);

      if (feedsInResult.size < this.DIVERSITY_CONFIG.minFeeds) {
        const diversityError = `Diversidade insuficiente: apenas ${feedsInResult.size} feeds de ${this.DIVERSITY_CONFIG.minFeeds} mínimos`;
        
        logRecovery('diversity_validation_failed', {
          correlationId,
          strategy: 'diversity-validation',
          success: false,
          error: diversityError,
          metadata: {
            foundFeeds: feedsInResult.size,
            requiredFeeds: this.DIVERSITY_CONFIG.minFeeds,
            diversityScore
          }
        });

        syncErrors.push({
          feedId: 'diversity-check',
          feedName: 'Sistema',
          errorMessage: diversityError,
          timestamp: Date.now(),
          strategy: 'diversity-validation'
        });
      } else {
        logRecovery('diversity_validation_passed', {
          correlationId,
          strategy: 'diversity-validation',
          success: true,
          metadata: {
            foundFeeds: feedsInResult.size,
            diversityScore
          }
        });
      }

      if (!freshArticles || freshArticles.length === 0) {
        logRecovery('no_articles_found', {
          correlationId,
          strategy: 'feed-diversity-manager',
          success: false,
          error: 'Nenhum artigo retornado pelo Feed Diversity Manager'
        });

        // Registrar métrica de falha
        recordMetric('sync_failure', 1, 'count', 'sync', undefined, {
          correlationId,
          phase: 'article_processing'
        });
        
        // Atualizar status de sync com erro
        const enhancedSyncStatus: EnhancedSyncStatus = {
          lastSync: Date.now(),
          nextSync: Date.now() + this.SYNC_INTERVAL,
          isSyncing: false,
          currentStrategy: 'feed-diversity-manager',
          feedsProcessed: feedHealthReport.totalFeeds,
          totalFeeds: feedHealthReport.totalFeeds,
          articlesFound: 0,
          newArticles: 0,
          errors: syncErrors,
          diversityScore: 0
        };
        
        newsDatabase.updateSyncStatus(enhancedSyncStatus);
        this.lastSyncTime = Date.now();
        newsDatabase.setSetting('lastSync', this.lastSyncTime.toString());
        
        return { success: true, newArticles: 0, diversityScore: 0, feedsProcessed: feedHealthReport.totalFeeds };
      }

      // Converter para formato do banco de dados com informações de feed
      const storedArticles: StoredArticle[] = freshArticles.map(article => {
        const excerpt = stripHtml(article.content).substring(0, 200) + '...';
        const imageUrl = extractImageFromContent(article.content);
        const category = article.categories[0] || 'Geral';

        return {
          id: article.id,
          title: article.title,
          author: article.author || 'Autor',
          content: article.content,
          excerpt,
          link: article.link,
          published: article.published,
          updated: article.updated,
          categories: JSON.stringify(article.categories),
          tags: JSON.stringify(article.tags),
          imageUrl,
          readingTime: calculateReadingTime(article.content),
          category,
          createdAt: Date.now(),
          isRead: false,
          isFavorite: false,
          // Enhanced fields
          feedName: category,
          retrievalStrategy: 'feed-diversity-manager',
          cacheTimestamp: Date.now()
        };
      });

      // Salvar no banco de dados com informações de feed
      let newArticlesCount = 0;
      
      logRecovery('article_processing_start', {
        correlationId,
        strategy: 'database-storage',
        success: true,
        articlesFound: storedArticles.length
      });

      logger.info('sync', `Starting article processing: ${storedArticles.length} articles to process`, {
        articlesCount: storedArticles.length,
        correlationId
      });

      // Estatísticas por feed
      const feedStats: Record<string, { new: number; existing: number }> = {};

      for (const article of storedArticles) {
        const feedName = article.category;
        if (!feedStats[feedName]) {
          feedStats[feedName] = { new: 0, existing: 0 };
        }

        const isNewArticle = newsDatabase.insertOrUpdateArticle(article);
        if (isNewArticle) {
          newArticlesCount++;
          feedStats[feedName].new++;
          
          logger.debug('sync', `New article saved: ${article.title.substring(0, 50)}...`, {
            feedName,
            articleId: article.id,
            correlationId
          });
        } else {
          feedStats[feedName].existing++;
          
          logger.debug('sync', `Article already exists: ${article.title.substring(0, 50)}...`, {
            feedName,
            articleId: article.id,
            correlationId
          });
        }
      }

      // Log estatísticas detalhadas por feed
      logger.info('sync', 'Feed statistics summary', {
        feedStats,
        totalNewArticles: newArticlesCount,
        totalFeeds: feedsInResult.size,
        totalArticlesInDB: newsDatabase.getTotalArticles(),
        correlationId
      });

      // Log individual de cada feed para auditoria
      Object.entries(feedStats).forEach(([feedName, stats]) => {
        logger.info('feeds', `Feed processing completed: ${feedName}`, {
          newArticles: stats.new,
          existingArticles: stats.existing,
          totalProcessed: stats.new + stats.existing,
          correlationId
        });

        // Registrar métricas por feed
        recordMetric('feed_articles_processed', stats.new + stats.existing, 'count', 'feed_performance', undefined, {
          feedId: feedName,
          correlationId,
          phase: 'processing'
        });

        recordMetric('feed_new_articles', stats.new, 'count', 'feed_performance', undefined, {
          feedId: feedName,
          correlationId,
          phase: 'processing'
        });
      });

      // Atualizar timestamp do último sync
      this.lastSyncTime = Date.now();
      newsDatabase.setSetting('lastSync', this.lastSyncTime.toString());

      // Usar limpeza com preservação de diversidade
      newsDatabase.cleanupOldArticlesWithDiversity();

      // Calcular métricas finais de diversidade
      const finalDiversityScore = newsDatabase.calculateDiversityScore();
      
      // Rastrear tendência de diversidade
      feedDiversityManager.trackDiversityTrend();
      
      // Obter relatório detalhado de diversidade
      const diversityReport = await feedDiversityManager.getDiversityReport(freshArticles);
      
      // Log métricas detalhadas de diversidade
      logger.info('diversity', 'Final diversity metrics', {
        balanceIndex: diversityReport.metrics.balanceIndex,
        giniCoefficient: diversityReport.metrics.giniCoefficient,
        entropyScore: diversityReport.metrics.entropyScore,
        standardDeviation: diversityReport.metrics.standardDeviation,
        coefficientOfVariation: diversityReport.metrics.coefficientOfVariation,
        correlationId
      });

      // Registrar métricas individuais para monitoramento
      recordMetric('final_balance_index', diversityReport.metrics.balanceIndex, 'ratio', 'diversity', 0.6, {
        correlationId,
        phase: 'final_analysis'
      });

      recordMetric('final_gini_coefficient', diversityReport.metrics.giniCoefficient, 'ratio', 'diversity', 0.5, {
        correlationId,
        phase: 'final_analysis'
      });

      recordMetric('final_entropy_score', diversityReport.metrics.entropyScore, 'ratio', 'diversity', 0.5, {
        correlationId,
        phase: 'final_analysis'
      });

      // Alertas de qualidade
      if (!diversityReport.isValid) {
        console.warn('⚠️ Alertas de diversidade:');
        diversityReport.issues.forEach(issue => console.warn(`   - ${issue}`));
      }

      // Atualizar status de sync detalhado
      const enhancedSyncStatus: EnhancedSyncStatus = {
        lastSync: this.lastSyncTime,
        nextSync: this.lastSyncTime + this.SYNC_INTERVAL,
        isSyncing: false,
        currentStrategy: 'feed-diversity-manager',
        feedsProcessed: feedHealthReport.totalFeeds,
        totalFeeds: feedHealthReport.totalFeeds,
        articlesFound: freshArticles.length,
        newArticles: newArticlesCount,
        errors: syncErrors,
        diversityScore: diversityReport.metrics.balanceIndex
      };

      newsDatabase.updateSyncStatus(enhancedSyncStatus);

      // Finalizar processo de recuperação com sucesso
      const totalSyncTime = Date.now() - syncStartTime;
      
      endRecovery(correlationId, {
        success: true,
        strategy: 'feed-diversity-manager',
        articlesFound: freshArticles.length,
        feedsProcessed: feedHealthReport.totalFeeds,
        executionTime: totalSyncTime,
        diversityScore: diversityReport.metrics.balanceIndex
      });

      // Registrar métricas finais de performance
      recordMetric('sync_total_time', totalSyncTime, 'ms', 'performance', 60000, {
        correlationId,
        phase: 'completion'
      });

      recordMetric('sync_success', 1, 'count', 'sync', undefined, {
        correlationId,
        phase: 'completion'
      });

      logger.info('sync', 'Sync completed successfully', {
        newArticles: newArticlesCount,
        totalFeeds: feedsInResult.size,
        diversityScore: diversityReport.metrics.balanceIndex,
        executionTime: totalSyncTime,
        correlationId
      });

      // Atualizar timestamp global de sync após sucesso
      this.updateGlobalSync();

      return { 
        success: true, 
        newArticles: newArticlesCount, 
        diversityScore: finalDiversityScore,
        feedsProcessed: feedHealthReport.totalFeeds
      };

    } catch (error) {
      const totalSyncTime = Date.now() - syncStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Log estruturado do erro
      logRecovery('sync_error', {
        correlationId,
        strategy: 'feed-diversity-manager',
        success: false,
        error: errorMessage,
        executionTime: totalSyncTime
      });

      // Finalizar processo de recuperação com erro
      endRecovery(correlationId, {
        success: false,
        strategy: 'feed-diversity-manager',
        articlesFound: 0,
        feedsProcessed: 0,
        executionTime: totalSyncTime,
        errors: [errorMessage]
      });

      // Registrar métricas de erro
      recordMetric('sync_error', 1, 'count', 'sync', undefined, {
        correlationId,
        phase: 'error'
      });

      recordMetric('sync_error_time', totalSyncTime, 'ms', 'performance', undefined, {
        correlationId,
        phase: 'error'
      });

      logger.error('sync', 'Sync failed with error', {
        error: errorMessage,
        executionTime: totalSyncTime,
        correlationId
      });
      
      // Registrar erro no status
      const errorSyncStatus: EnhancedSyncStatus = {
        lastSync: Date.now(),
        nextSync: Date.now() + this.SYNC_INTERVAL,
        isSyncing: false,
        currentStrategy: 'feed-diversity-manager',
        feedsProcessed: 0,
        totalFeeds: 0,
        articlesFound: 0,
        newArticles: 0,
        errors: [{
          feedId: 'sync-service',
          feedName: 'Sistema',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: Date.now(),
          strategy: 'feed-diversity-manager'
        }],
        diversityScore: 0
      };
      
      newsDatabase.updateSyncStatus(errorSyncStatus);
      
      return {
        success: false,
        newArticles: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        diversityScore: 0,
        feedsProcessed: 0
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // Forçar sync manual (ignora verificação global)
  async forceSync(): Promise<{ success: boolean; newArticles: number; error?: string }> {
    console.log('🔄 Forçando sincronização manual (ignorando verificação global)...');
    return this.performSync();
  }

  // Método privado para calcular score de diversidade
  private calculateDiversityScore(articles: { categories: string[] }[]): number {
    if (articles.length === 0) return 0;

    // Contar artigos por feed
    const feedCounts: Record<string, number> = {};
    articles.forEach(article => {
      const feedName = article.categories[0] || 'Unknown';
      feedCounts[feedName] = (feedCounts[feedName] || 0) + 1;
    });

    const feedKeys = Object.keys(feedCounts);
    const counts = Object.values(feedCounts);
    
    if (feedKeys.length <= 1) return 0;

    // Calcular distribuição ideal vs real
    const totalArticles = articles.length;
    const idealDistribution = totalArticles / feedKeys.length;
    
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - idealDistribution, 2);
    }, 0) / feedKeys.length;
    
    // Normalizar score (0-1)
    const maxPossibleVariance = Math.pow(totalArticles, 2) / feedKeys.length;
    return Math.max(0, 1 - (variance / maxPossibleVariance));
  }

  // Obter status do sync com informações de diversidade
  getSyncStatus() {
    const enhancedStatus = newsDatabase.getEnhancedSyncStatus();
    const basicStatus = {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime: this.lastSyncTime + this.SYNC_INTERVAL,
      timeUntilNextSync: Math.max(0, (this.lastSyncTime + this.SYNC_INTERVAL) - Date.now()),
    };

    if (enhancedStatus) {
      return {
        ...basicStatus,
        diversityScore: enhancedStatus.diversityScore,
        feedsProcessed: enhancedStatus.feedsProcessed,
        totalFeeds: enhancedStatus.totalFeeds,
        articlesFound: enhancedStatus.articlesFound,
        newArticles: enhancedStatus.newArticles,
        errors: enhancedStatus.errors,
        currentStrategy: enhancedStatus.currentStrategy
      };
    }

    return basicStatus;
  }

  // Obter relatório de saúde dos feeds
  async getFeedHealthReport() {
    return await feedDiversityManager.getFeedHealthStatus();
  }

  // Forçar atualização de feeds específicos
  async refreshSpecificFeeds(feedIds: string[]) {
    return await feedDiversityManager.refreshSpecificFeeds(feedIds);
  }

  // Obter relatório detalhado de diversidade
  async getDiversityReport() {
    return await feedDiversityManager.getDiversityReport();
  }

  // Obter análise de distribuição de feeds
  async getFeedDistributionAnalysis() {
    return await feedDiversityManager.getFeedDistributionAnalysis();
  }

  // Obter análise de tendência de diversidade
  getDiversityTrendAnalysis(days: number = 7) {
    return feedDiversityManager.getDiversityTrendAnalysis(days);
  }

  // Validar diversidade atual do cache
  validateCurrentDiversity() {
    const cachedArticles = newsDatabase.getArticles(1, 100);
    const freshRSSArticles = cachedArticles.map(stored => ({
      id: stored.id,
      title: stored.title,
      author: stored.author,
      content: stored.content,
      link: stored.link,
      published: stored.published,
      updated: stored.updated,
      categories: stored.categories ? JSON.parse(stored.categories) : [stored.category],
      tags: stored.tags ? JSON.parse(stored.tags) : []
    }));

    return diversityValidator.validateFeedDiversity(freshRSSArticles, {
      minFeeds: this.DIVERSITY_CONFIG.minFeeds,
      maxPerFeed: this.DIVERSITY_CONFIG.maxPerFeed,
      minDiversityScore: 0.4,
      maxImbalanceRatio: 5.0
    });
  }

  // Métodos de gerenciamento de erros
  getFeedErrorStats(feedId: string) {
    return feedDiversityManager.getFeedErrorStats(feedId);
  }

  getQuarantinedFeeds() {
    return feedDiversityManager.getQuarantinedFeeds();
  }

  async attemptFeedRecovery(feedId: string) {
    const result = await feedDiversityManager.attemptFeedRecovery(feedId);
    
    if (result.success) {
      // Se a recuperação foi bem-sucedida, forçar um sync
      await this.forceSync();
    }
    
    return result;
  }

  clearFeedErrors(feedId: string) {
    feedDiversityManager.clearFeedErrors(feedId);
  }

  releaseFromQuarantine(feedId: string) {
    feedDiversityManager.releaseFromQuarantine(feedId);
  }

  getFeedRecoveryPlan(feedId: string) {
    return feedDiversityManager.getFeedRecoveryPlan(feedId);
  }

  // Método para recuperação automática de todos os feeds com problemas
  async attemptAllFeedsRecovery() {
    const quarantinedFeeds = this.getQuarantinedFeeds();
    const results = [];

    for (const feed of quarantinedFeeds) {
      if (feed.canRetry) {
        const result = await this.attemptFeedRecovery(feed.feedId);
        results.push({
          feedId: feed.feedId,
          feedName: feed.feedName,
          ...result
        });
      }
    }

    return results;
  }

  // Métodos de performance e monitoramento
  getPerformanceStats() {
    const { getAllCacheStats } = require('./performanceCache');
    const cacheStats = getAllCacheStats();
    
    return {
      syncInterval: this.SYNC_INTERVAL,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      diversityConfig: this.DIVERSITY_CONFIG,
      cacheStats,
      configSummary: this.getConfigSummary()
    };
  }

  private getConfigSummary() {
    return {
      articleLimit: diversityConfig.syncArticleLimit,
      maxPerFeed: diversityConfig.maxArticlesPerFeed,
      minFeeds: diversityConfig.minFeedsRequired,
      globalTimeout: diversityConfig.timeouts.global,
      maxConcurrent: diversityConfig.performance.maxConcurrentStrategies,
      retryAttempts: diversityConfig.performance.retryMaxAttempts,
      cacheSize: diversityConfig.cache.maxCachedArticles,
      minDiversityScore: diversityConfig.validation.minDiversityScore
    };
  }

  // Método para otimizar configuração baseado em performance
  optimizeConfiguration() {
    const stats = this.getPerformanceStats();
    const recommendations: string[] = [];

    // Analisar cache hit rate
    const avgHitRate = Object.values(stats.cacheStats)
      .reduce((sum: number, stat: any) => sum + stat.hitRate, 0) / Object.keys(stats.cacheStats).length;

    if (avgHitRate < 0.5) {
      recommendations.push('Considere aumentar TTL dos caches para melhorar hit rate');
    }

    // Analisar timeouts
    const currentSyncStatus = this.getSyncStatus();
    if (currentSyncStatus.errors && currentSyncStatus.errors.length > 0) {
      const timeoutErrors = currentSyncStatus.errors.filter((error: any) => 
        error.errorMessage.includes('timeout') || error.errorMessage.includes('timed out')
      );
      
      if (timeoutErrors.length > 0) {
        recommendations.push('Considere aumentar timeouts das estratégias');
      }
    }

    // Analisar diversidade
    if (currentSyncStatus.diversityScore && currentSyncStatus.diversityScore < 0.5) {
      recommendations.push('Considere ajustar maxPerFeed ou minFeeds para melhorar diversidade');
    }

    return {
      currentConfig: this.getConfigSummary(),
      recommendations,
      optimizationSuggestions: this.generateOptimizationSuggestions(stats)
    };
  }

  private generateOptimizationSuggestions(stats: any) {
    const suggestions: string[] = [];

    // Sugestões baseadas em performance
    if (stats.cacheStats.feedHealth.hitRate > 0.8) {
      suggestions.push('Cache de saúde dos feeds está eficiente - pode aumentar TTL');
    }

    if (stats.cacheStats.strategyResults.hitRate < 0.3) {
      suggestions.push('Cache de resultados de estratégias pouco eficiente - revisar TTL');
    }

    // Sugestões baseadas em configuração
    if (diversityConfig.performance.maxConcurrentStrategies === 1) {
      suggestions.push('Considere aumentar maxConcurrentStrategies para melhor performance');
    }

    if (diversityConfig.timeouts.global > 45000) {
      suggestions.push('Timeout global muito alto - pode impactar experiência do usuário');
    }

    return suggestions;
  }

  // Parar serviço
  destroy() {
    this.stopAutoSync();
    newsDatabase.close();
  }
}

// Instância singleton do serviço de sync
export const syncService = new SyncService();

// Função para formatar tempo até próximo sync
export const formatTimeUntilNextSync = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};
