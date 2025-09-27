// Feed Diversity Manager - Coordena todas as estratégias de recuperação
import { FreshRSSArticle, freshRSSService, ArticleResult, RetrievalOptions, FeedHealth } from './freshrss';
import { feedBalancer, BalanceOptions } from './feedBalancer';
import { retrievalEngine, StrategyExecutorOptions } from './retrievalEngine';
import { diversityValidator, DiversityRequirements, ValidationReport } from './diversityValidator';
import { feedErrorManager } from './feedErrorManager';
import { feedHealthCache, diversityMetricsCache, feedDistributionCache } from './performanceCache';
import { diversityConfig } from './config';

export interface DiversityOptions {
  limit: number;
  maxPerFeed: number;
  minFeeds: number;
  strategies: string[];
  timeoutMs?: number;
}

export interface FeedHealthReport {
  totalFeeds: number;
  activeFeeds: number;
  failedFeeds: FeedError[];
  lastUpdate: number;
  articlesPerFeed: Record<string, number>;
  diversityScore: number;
  recommendations: string[];
}

export interface FeedError {
  feedId: string;
  feedName: string;
  errorType: 'api' | 'feed' | 'data' | 'cache';
  errorMessage: string;
  timestamp: number;
  strategy: string;
  retryCount: number;
}

export interface RefreshResult {
  success: boolean;
  feedsRefreshed: number;
  articlesFound: number;
  errors: FeedError[];
}

export interface StrategyResult {
  strategy: string;
  result: ArticleResult;
  executionTime: number;
  score: number;
}

export interface ValidationReport {
  isValid: boolean;
  diversityScore: number;
  feedCount: number;
  issues: string[];
  recommendations: string[];
}

class FeedDiversityManagerImpl {
  private readonly DEFAULT_STRATEGIES = [
    'multiple-feeds',
    'time-window', 
    'category-based',
    'bulk-retrieval'
  ];

  private readonly STRATEGY_PRIORITIES = {
    'multiple-feeds': 1,
    'time-window': 2,
    'category-based': 3,
    'bulk-retrieval': 4
  };

  async getArticlesWithDiversity(options: DiversityOptions): Promise<FreshRSSArticle[]> {
    const { 
      limit, 
      maxPerFeed, 
      minFeeds, 
      strategies = this.DEFAULT_STRATEGIES,
      timeoutMs = 30000 
    } = options;

    console.log(`🎯 Iniciando busca com diversidade: ${limit} artigos, max ${maxPerFeed} por feed, min ${minFeeds} feeds`);

    try {
      // Configurar opções para o Retrieval Engine
      const retrievalOptions: StrategyExecutorOptions & RetrievalOptions = {
        limit,
        // Não passar strategies para usar as estratégias padrão do engine
        fallbackToCache: true,
        maxConcurrentStrategies: 2,
        globalTimeout: timeoutMs
      };

      // Executar com sistema robusto de retry e fallback
      const executionResult = await retrievalEngine.executeWithFallback(retrievalOptions);

      if (!executionResult.success || executionResult.articles.length === 0) {
        console.warn('Retrieval Engine não retornou artigos:', executionResult.errors);
        return [];
      }

      console.log(`📡 Retrieval Engine: ${executionResult.articles.length} artigos via '${executionResult.strategy}'${executionResult.fallbackUsed ? ' (fallback)' : ''}`);

      // Aplicar balanceamento
      const balanceOptions: BalanceOptions = {
        maxPerFeed,
        minFeeds,
        distributionStrategy: 'even'
      };

      const balancedArticles = feedBalancer.balanceArticles(executionResult.articles, balanceOptions);
      
      // Validar resultado final usando Diversity Validator
      const diversityRequirements: DiversityRequirements = {
        minFeeds,
        maxPerFeed,
        minDiversityScore: 0.4, // 40% mínimo de diversidade
        maxImbalanceRatio: 5.0, // Máximo 5:1 de desequilíbrio
        requireAllFeedsActive: false
      };

      const validation = diversityValidator.validateFeedDiversity(balancedArticles, diversityRequirements);
      
      // Log métricas detalhadas
      console.log('📊 Métricas de diversidade:', {
        score: (validation.diversityScore * 100).toFixed(1) + '%',
        feeds: validation.feedCount,
        gini: (validation.metrics.giniCoefficient * 100).toFixed(1) + '%',
        entropy: (validation.metrics.entropyScore * 100).toFixed(1) + '%',
        balance: (validation.metrics.balanceIndex * 100).toFixed(1) + '%'
      });
      
      if (!validation.isValid) {
        console.warn('❌ Resultado não atende aos critérios de diversidade:');
        validation.issues.forEach(issue => console.warn(`   - ${issue}`));
        
        console.log('💡 Recomendações:');
        validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
        
        // Se a validação falhou mas temos artigos, tentar estratégia de recuperação
        if (balancedArticles.length > 0 && validation.feedCount < minFeeds) {
          console.log('🔄 Tentando recuperação com feeds adicionais...');
          
          // Tentar buscar artigos de feeds específicos que estão faltando
          const additionalArticles = await this.tryRecoverMissingFeeds(balancedArticles, minFeeds, limit - balancedArticles.length);
          
          if (additionalArticles.length > 0) {
            balancedArticles.push(...additionalArticles);
            console.log(`✅ Recuperados ${additionalArticles.length} artigos adicionais`);
            
            // Re-validar após recuperação
            const reValidation = diversityValidator.validateFeedDiversity(balancedArticles, diversityRequirements);
            console.log(`📊 Score após recuperação: ${(reValidation.diversityScore * 100).toFixed(1)}%`);
          }
        }
      } else {
        console.log('✅ Critérios de diversidade atendidos');
      }

      const finalArticles = balancedArticles.slice(0, limit);
      const finalFeedCount = new Set(finalArticles.map(a => a.categories[0])).size;

      console.log(`✅ Feed Diversity Manager: ${finalArticles.length} artigos de ${finalFeedCount} feeds usando '${executionResult.strategy}'`);
      
      if (executionResult.fallbackUsed) {
        console.log('📦 Resultado obtido via fallback para cache local');
      }

      return finalArticles;

    } catch (error) {
      console.error('Erro no Feed Diversity Manager:', error);
      
      // Último recurso: tentar busca direta no cache
      try {
        console.log('🆘 Tentando último recurso: busca direta no cache...');
        const cacheResult = await retrievalEngine.executeWithFallback({
          limit,
          strategies: [],
          fallbackToCache: true,
          maxConcurrentStrategies: 1,
          globalTimeout: 5000
        });

        if (cacheResult.success && cacheResult.articles.length > 0) {
          console.log(`📦 Último recurso bem-sucedido: ${cacheResult.articles.length} artigos do cache`);
          return cacheResult.articles.slice(0, limit);
        }
      } catch (fallbackError) {
        console.error('Último recurso também falhou:', fallbackError);
      }

      return [];
    }
  }

  async getFeedHealthStatus(): Promise<FeedHealthReport> {
    // Verificar cache primeiro
    const cacheKey = 'feed-health-status';
    const cachedResult = feedHealthCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const feedsHealth = await freshRSSService.getAllFeedsHealth();
      const activeFeeds = feedsHealth.filter(feed => feed.isActive && !feedErrorManager.isQuarantined(feed.feedId));
      
      // Obter feeds com falha, incluindo informações detalhadas de erro
      const failedFeeds = feedsHealth
        .filter(feed => !feed.isActive || feedErrorManager.isQuarantined(feed.feedId))
        .map(feed => {
          const errorStats = feedErrorManager.getFeedErrorStats(feed.feedId);
          return {
            feedId: feed.feedId,
            feedName: feed.feedName,
            errorType: errorStats.lastError?.errorType || 'feed' as const,
            errorMessage: errorStats.lastError?.errorMessage || 'Feed inactive',
            timestamp: errorStats.lastError?.timestamp || Date.now(),
            strategy: errorStats.lastError?.strategy || 'health-check',
            retryCount: errorStats.consecutiveFailures
          };
        });

      // Calcular artigos por feed
      const articlesPerFeed: Record<string, number> = {};
      feedsHealth.forEach(feed => {
        articlesPerFeed[feed.feedName] = feed.articleCount;
      });

      // Calcular score de diversidade
      const diversityScore = this.calculateHealthDiversityScore(feedsHealth);

      // Gerar recomendações incluindo informações de quarentena
      const recommendations = this.generateHealthRecommendations(feedsHealth);
      
      // Adicionar recomendações específicas de erro
      const quarantinedFeeds = feedErrorManager.getQuarantinedFeeds();
      if (quarantinedFeeds.length > 0) {
        recommendations.push(`${quarantinedFeeds.length} feeds em quarentena precisam de atenção`);
      }

      const result = {
        totalFeeds: feedsHealth.length,
        activeFeeds: activeFeeds.length,
        failedFeeds,
        lastUpdate: Date.now(),
        articlesPerFeed,
        diversityScore,
        recommendations
      };

      // Armazenar no cache
      feedHealthCache.set(cacheKey, result, diversityConfig.performance.feedHealthCacheTTL);
      
      return result;
    } catch (error) {
      return {
        totalFeeds: 0,
        activeFeeds: 0,
        failedFeeds: [],
        lastUpdate: Date.now(),
        articlesPerFeed: {},
        diversityScore: 0,
        recommendations: ['Erro ao verificar status dos feeds']
      };
    }
  }

  async refreshSpecificFeeds(feedIds: string[]): Promise<RefreshResult> {
    const errors: FeedError[] = [];
    let feedsRefreshed = 0;
    let totalArticles = 0;

    for (const feedId of feedIds) {
      try {
        const articles = await freshRSSService.getArticlesByFeed(feedId, 20);
        if (articles.length > 0) {
          feedsRefreshed++;
          totalArticles += articles.length;
        }
      } catch (error) {
        errors.push({
          feedId,
          feedName: `Feed ${feedId}`,
          errorType: 'api',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          strategy: 'refresh-specific',
          retryCount: 0
        });
      }
    }

    return {
      success: feedsRefreshed > 0,
      feedsRefreshed,
      articlesFound: totalArticles,
      errors
    };
  }

  // Métodos privados

  private async tryRecoverMissingFeeds(currentArticles: FreshRSSArticle[], minFeeds: number, remainingSlots: number): Promise<FreshRSSArticle[]> {
    if (remainingSlots <= 0) return [];

    try {
      // Identificar feeds que já temos
      const currentFeeds = new Set(currentArticles.map(a => a.categories[0]));
      
      if (currentFeeds.size >= minFeeds) return [];

      // Tentar buscar feeds específicos que estão faltando
      const allFeeds = await freshRSSService.getFeeds();
      const missingFeeds = allFeeds.filter(feed => !currentFeeds.has(feed.name));

      if (missingFeeds.length === 0) return [];

      console.log(`🔍 Tentando recuperar artigos de ${missingFeeds.length} feeds faltantes...`);

      const additionalArticles: FreshRSSArticle[] = [];
      const articlesPerMissingFeed = Math.ceil(remainingSlots / Math.min(missingFeeds.length, minFeeds - currentFeeds.size));

      for (const feed of missingFeeds.slice(0, minFeeds - currentFeeds.size)) {
        try {
          const feedArticles = await freshRSSService.getArticlesByFeed(feed.id, articlesPerMissingFeed);
          if (feedArticles.length > 0) {
            additionalArticles.push(...feedArticles.slice(0, articlesPerMissingFeed));
            console.log(`✅ Recuperados ${feedArticles.length} artigos de ${feed.name}`);
          }
        } catch (error) {
          console.warn(`⚠️ Falha ao recuperar artigos de ${feed.name}:`, error);
        }

        if (additionalArticles.length >= remainingSlots) break;
      }

      return additionalArticles.slice(0, remainingSlots);
    } catch (error) {
      console.error('Erro na recuperação de feeds faltantes:', error);
      return [];
    }
  }

  // Método para obter relatório detalhado de diversidade
  async getDiversityReport(articles?: FreshRSSArticle[]): Promise<ValidationReport> {
    const articlesToAnalyze = articles || await this.getArticlesWithDiversity({
      limit: 100,
      maxPerFeed: 15,
      minFeeds: 3,
      strategies: this.DEFAULT_STRATEGIES
    });

    const requirements: DiversityRequirements = {
      minFeeds: 3,
      maxPerFeed: 15,
      minDiversityScore: 0.4,
      maxImbalanceRatio: 5.0
    };

    return diversityValidator.validateFeedDiversity(articlesToAnalyze, requirements);
  }

  // Método para obter análise de distribuição de feeds
  async getFeedDistributionAnalysis(articles?: FreshRSSArticle[]) {
    const articlesToAnalyze = articles || await this.getArticlesWithDiversity({
      limit: 100,
      maxPerFeed: 15,
      minFeeds: 3,
      strategies: this.DEFAULT_STRATEGIES
    });

    return diversityValidator.analyzeFeedDistribution(articlesToAnalyze);
  }

  // Método para rastrear tendência de diversidade
  trackDiversityTrend(): void {
    diversityValidator.trackDiversityTrend();
  }

  // Método para obter análise de tendência
  getDiversityTrendAnalysis(days: number = 7) {
    return diversityValidator.getDiversityTrendAnalysis(days);
  }

  // Métodos de gerenciamento de erros
  getFeedErrorStats(feedId: string) {
    return feedErrorManager.getFeedErrorStats(feedId);
  }

  getQuarantinedFeeds() {
    return feedErrorManager.getQuarantinedFeeds();
  }

  async attemptFeedRecovery(feedId: string) {
    return await feedErrorManager.attemptFeedRecovery(feedId);
  }

  clearFeedErrors(feedId: string) {
    feedErrorManager.clearFeedErrors(feedId);
  }

  releaseFromQuarantine(feedId: string) {
    feedErrorManager.releaseFromQuarantine(feedId);
  }

  getFeedRecoveryPlan(feedId: string) {
    return feedErrorManager.getRecoveryPlan(feedId);
  }

  private calculateHealthDiversityScore(feedsHealth: FeedHealth[]): number {
    if (feedsHealth.length === 0) return 0;

    const activeFeeds = feedsHealth.filter(feed => feed.isActive);
    const activeFeedRatio = activeFeeds.length / feedsHealth.length;

    // Calcular distribuição de artigos entre feeds ativos
    const articleCounts = activeFeeds.map(feed => feed.articleCount);
    if (articleCounts.length === 0) return 0;

    const totalArticles = articleCounts.reduce((sum, count) => sum + count, 0);
    if (totalArticles === 0) return activeFeedRatio * 0.5; // Penalizar se não há artigos

    const averageArticles = totalArticles / articleCounts.length;
    const variance = articleCounts.reduce((sum, count) => {
      return sum + Math.pow(count - averageArticles, 2);
    }, 0) / articleCounts.length;

    const maxPossibleVariance = Math.pow(totalArticles, 2) / articleCounts.length;
    const distributionScore = Math.max(0, 1 - (variance / maxPossibleVariance));

    return (activeFeedRatio * 0.6) + (distributionScore * 0.4);
  }

  private generateHealthRecommendations(feedsHealth: FeedHealth[]): string[] {
    const recommendations: string[] = [];
    const activeFeeds = feedsHealth.filter(feed => feed.isActive);
    const inactiveFeeds = feedsHealth.filter(feed => !feed.isActive);

    if (inactiveFeeds.length > 0) {
      recommendations.push(`${inactiveFeeds.length} feeds inativos precisam de atenção`);
    }

    if (activeFeeds.length < 3) {
      recommendations.push('Poucos feeds ativos - considere adicionar mais fontes RSS');
    }

    const feedsWithErrors = feedsHealth.filter(feed => feed.errorCount > 0);
    if (feedsWithErrors.length > feedsHealth.length * 0.3) {
      recommendations.push('Muitos feeds com erros - verificar conectividade');
    }

    const articleCounts = activeFeeds.map(feed => feed.articleCount);
    if (articleCounts.length > 0) {
      const maxArticles = Math.max(...articleCounts);
      const minArticles = Math.min(...articleCounts);
      
      if (maxArticles > minArticles * 5) {
        recommendations.push('Distribuição muito desigual de artigos entre feeds');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Status dos feeds está adequado');
    }

    return recommendations;
  }
}

// Instância singleton do Feed Diversity Manager
export const feedDiversityManager = new FeedDiversityManagerImpl();