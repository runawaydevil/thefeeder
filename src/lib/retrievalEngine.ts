// Retrieval Engine - Sistema robusto de retry e fallback para recuperação de feeds
import { FreshRSSArticle, ArticleResult, RetrievalOptions, freshRSSService } from './freshrss';
import { newsDatabase } from './database';
import { diversityConfig } from './config';
import { strategyResultsCache } from './performanceCache';

export interface RetrievalStrategy {
  name: string;
  execute: (options: RetrievalOptions) => Promise<ArticleResult>;
  validate: (result: ArticleResult) => boolean;
  priority: number;
  timeout: number;
}

export interface StrategyExecutorOptions {
  strategies: RetrievalStrategy[];
  fallbackToCache: boolean;
  maxConcurrentStrategies: number;
  globalTimeout: number;
}

export interface ExecutionResult {
  success: boolean;
  articles: FreshRSSArticle[];
  strategy: string;
  executionTime: number;
  errors: string[];
  fallbackUsed: boolean;
}

class RetrievalEngineImpl {
  private readonly DEFAULT_STRATEGIES: RetrievalStrategy[] = [
    {
      name: 'multiple-feeds',
      execute: (options) => freshRSSService.getArticlesByMultipleFeeds(options),
      validate: (result) => result.success && result.feedsFound >= 1 && result.totalArticles > 0,
      priority: 1,
      timeout: diversityConfig.timeouts.multipleFeeds
    },
    {
      name: 'time-window',
      execute: (options) => freshRSSService.getArticlesByTimeWindow({
        ...options,
        timeWindow: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000), // Última semana
          end: Date.now()
        }
      }),
      validate: (result) => result.success && result.totalArticles > 0,
      priority: 2,
      timeout: diversityConfig.timeouts.timeWindow
    },
    {
      name: 'category-based',
      execute: (options) => freshRSSService.getArticlesByCategory(options),
      validate: (result) => result.success && result.feedsFound >= 1 && result.totalArticles > 0,
      priority: 3,
      timeout: diversityConfig.timeouts.categoryBased
    },
    {
      name: 'bulk-retrieval',
      execute: async (options) => {
        const articles = await freshRSSService.getAllArticles(options.limit || 100);
        const uniqueFeeds = new Set(articles.map(a => a.categories[0]));
        
        return {
          articles,
          strategy: 'bulk-retrieval',
          success: articles.length > 0,
          feedsFound: uniqueFeeds.size,
          totalArticles: articles.length
        };
      },
      validate: (result) => result.success && result.totalArticles > 0,
      priority: 4,
      timeout: diversityConfig.timeouts.bulkRetrieval
    }
  ];

  async executeWithFallback(options: StrategyExecutorOptions & RetrievalOptions): Promise<ExecutionResult> {
    const {
      strategies = this.DEFAULT_STRATEGIES,
      fallbackToCache = true,
      maxConcurrentStrategies = diversityConfig.performance.maxConcurrentStrategies,
      globalTimeout = diversityConfig.timeouts.global,
      ...retrievalOptions
    } = options;

    // Verificar cache primeiro
    const cacheKey = `retrieval-${JSON.stringify(retrievalOptions)}`;
    const cachedResult = strategyResultsCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let bestResult: ArticleResult | null = null;
    let usedStrategy = '';

    try {
      // Ordenar estratégias por prioridade
      const sortedStrategies = [...strategies].sort((a, b) => a.priority - b.priority);
      console.log(`🎯 Retrieval Engine iniciado com ${sortedStrategies.length} estratégias:`, sortedStrategies.map(s => s.name));

      // Executar estratégias em grupos baseado no maxConcurrentStrategies
      for (let i = 0; i < sortedStrategies.length; i += maxConcurrentStrategies) {
        const strategyBatch = sortedStrategies.slice(i, i + maxConcurrentStrategies);
        
        console.log(`🔄 Executando batch de estratégias: ${strategyBatch.map(s => s.name).join(', ')}`);

        const batchResults = await this.executeBatch(strategyBatch, retrievalOptions, globalTimeout);
        
        // Encontrar o melhor resultado do batch
        const validResults = batchResults.filter(result => {
          if (!result.result) {
            console.log(`❌ ${result.strategy.name}: Sem resultado`);
            return false;
          }
          
          const isValid = result.strategy.validate(result.result);
          console.log(`🔍 Validação ${result.strategy.name}:`, {
            success: result.result.success,
            articles: result.result.articles?.length,
            feedsFound: result.result.feedsFound,
            totalArticles: result.result.totalArticles,
            isValid
          });
          
          return isValid;
        });

        if (validResults.length > 0) {
          // Selecionar o melhor resultado baseado em score
          const bestBatchResult = validResults.reduce((best, current) => {
            const bestScore = this.calculateResultScore(best.result!);
            const currentScore = this.calculateResultScore(current.result!);
            return currentScore > bestScore ? current : best;
          });

          bestResult = bestBatchResult.result!;
          usedStrategy = bestBatchResult.strategy.name;
          console.log(`✅ Estratégia bem-sucedida: ${usedStrategy}`);
          break;
        } else {
          // Registrar erros do batch
          batchResults.forEach(result => {
            if (result.error) {
              errors.push(`${result.strategy.name}: ${result.error}`);
            }
          });
        }

        // Se não é o último batch, aguardar um pouco antes do próximo
        if (i + maxConcurrentStrategies < sortedStrategies.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Se nenhuma estratégia funcionou, tentar fallback para cache
      if (!bestResult && fallbackToCache) {
        console.log('🔄 Todas as estratégias falharam, tentando fallback para cache...');
        
        const cacheResult = await this.fallbackToCache(retrievalOptions);
        if (cacheResult.articles.length > 0) {
          return {
            success: true,
            articles: cacheResult.articles,
            strategy: 'cache-fallback',
            executionTime: Date.now() - startTime,
            errors,
            fallbackUsed: true
          };
        } else {
          errors.push('Cache fallback: Nenhum artigo encontrado no cache');
        }
      }

      let result: ExecutionResult;
      
      if (bestResult) {
        result = {
          success: true,
          articles: bestResult.articles,
          strategy: usedStrategy,
          executionTime: Date.now() - startTime,
          errors,
          fallbackUsed: false
        };
      } else {
        result = {
          success: false,
          articles: [],
          strategy: 'none',
          executionTime: Date.now() - startTime,
          errors,
          fallbackUsed: false
        };
      }

      // Armazenar resultado no cache se bem-sucedido
      if (result.success) {
        strategyResultsCache.set(cacheKey, result, 60000); // 1 minuto
      }

      return result;

    } catch (error) {
      errors.push(`Global execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Último recurso: tentar cache mesmo com erro global
      if (fallbackToCache) {
        try {
          const cacheResult = await this.fallbackToCache(retrievalOptions);
          if (cacheResult.articles.length > 0) {
            return {
              success: true,
              articles: cacheResult.articles,
              strategy: 'emergency-cache-fallback',
              executionTime: Date.now() - startTime,
              errors,
              fallbackUsed: true
            };
          }
        } catch (cacheError) {
          errors.push(`Emergency cache fallback failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`);
        }
      }

      return {
        success: false,
        articles: [],
        strategy: 'failed',
        executionTime: Date.now() - startTime,
        errors,
        fallbackUsed: false
      };
    }
  }

  private async executeBatch(
    strategies: RetrievalStrategy[], 
    options: RetrievalOptions, 
    globalTimeout: number
  ): Promise<Array<{ strategy: RetrievalStrategy; result?: ArticleResult; error?: string }>> {
    
    const promises = strategies.map(async (strategy) => {
      try {
        console.log(`🔄 Executando estratégia: ${strategy.name} com timeout ${strategy.timeout}ms`);
        const strategyTimeout = Math.min(strategy.timeout, globalTimeout);
        
        const result = await Promise.race([
          strategy.execute(options),
          this.createTimeoutPromise(strategyTimeout, strategy.name)
        ]);

        console.log(`✅ Estratégia ${strategy.name} executada:`, {
          success: result?.success,
          articles: result?.articles?.length,
          feedsFound: result?.feedsFound
        });

        return { strategy, result };
      } catch (error) {
        console.error(`❌ Estratégia ${strategy.name} falhou:`, error);
        return { 
          strategy, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    return await Promise.allSettled(promises).then(results => 
      results.map(result => 
        result.status === 'fulfilled' ? result.value : { 
          strategy: strategies[0], // Fallback strategy reference
          error: 'Promise rejected' 
        }
      )
    );
  }

  private createTimeoutPromise(timeout: number, strategyName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Strategy '${strategyName}' timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private calculateResultScore(result: ArticleResult): number {
    if (!result.success || result.articles.length === 0) return 0;

    // Fatores de pontuação
    const diversityScore = result.feedsFound > 1 ? Math.min(result.feedsFound / 5, 1) : 0; // Max 1.0
    const volumeScore = Math.min(result.totalArticles / 50, 1); // Max 1.0
    const successBonus = result.success ? 0.2 : 0;

    return (diversityScore * 0.5) + (volumeScore * 0.3) + successBonus;
  }

  private async fallbackToCache(options: RetrievalOptions): Promise<{ articles: FreshRSSArticle[]; fromCache: boolean }> {
    try {
      console.log('📦 Tentando recuperar artigos do cache local...');
      
      // Buscar artigos do cache com balanceamento
      const cachedArticles = newsDatabase.getArticlesWithFeedBalance({
        page: 1,
        limit: options.limit || 100,
        minFeeds: 2,
        maxPerFeed: 15
      });

      if (cachedArticles.length === 0) {
        // Se não há artigos balanceados, tentar busca normal
        const normalCachedArticles = newsDatabase.getArticles(1, options.limit || 100);
        
        if (normalCachedArticles.length > 0) {
          console.log(`📦 Recuperados ${normalCachedArticles.length} artigos do cache (busca normal)`);
          
          return {
            articles: normalCachedArticles.map(this.convertStoredToFreshRSS),
            fromCache: true
          };
        }
      } else {
        console.log(`📦 Recuperados ${cachedArticles.length} artigos do cache (balanceado)`);
        
        return {
          articles: cachedArticles.map(this.convertStoredToFreshRSS),
          fromCache: true
        };
      }

      return { articles: [], fromCache: true };
    } catch (error) {
      console.error('Erro ao acessar cache:', error);
      return { articles: [], fromCache: true };
    }
  }

  private convertStoredToFreshRSS(stored: {
    id: string;
    title: string;
    author: string;
    content: string;
    link: string;
    published: number;
    updated: number;
    categories?: string;
    category?: string;
    tags?: string;
  }): FreshRSSArticle {
    return {
      id: stored.id,
      title: stored.title,
      author: stored.author,
      content: stored.content,
      link: stored.link,
      published: stored.published,
      updated: stored.updated,
      categories: stored.categories ? JSON.parse(stored.categories) : [stored.category],
      tags: stored.tags ? JSON.parse(stored.tags) : []
    };
  }

  // Método para testar conectividade de uma estratégia específica
  async testStrategy(strategyName: string, options: RetrievalOptions): Promise<{ success: boolean; error?: string; executionTime: number }> {
    const strategy = this.DEFAULT_STRATEGIES.find(s => s.name === strategyName);
    
    if (!strategy) {
      return {
        success: false,
        error: `Strategy '${strategyName}' not found`,
        executionTime: 0
      };
    }

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        strategy.execute(options),
        this.createTimeoutPromise(strategy.timeout, strategy.name)
      ]);

      const isValid = strategy.validate(result);
      
      return {
        success: isValid,
        error: isValid ? undefined : 'Strategy validation failed',
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  // Método para obter estatísticas de performance das estratégias
  getStrategyInfo(): Array<{ name: string; priority: number; timeout: number }> {
    return this.DEFAULT_STRATEGIES.map(strategy => ({
      name: strategy.name,
      priority: strategy.priority,
      timeout: strategy.timeout
    }));
  }

  // Método para configurar timeouts personalizados
  configureTimeouts(timeouts: Record<string, number>): void {
    this.DEFAULT_STRATEGIES.forEach(strategy => {
      if (timeouts[strategy.name]) {
        strategy.timeout = timeouts[strategy.name];
      }
    });
  }
}

// Instância singleton do Retrieval Engine
export const retrievalEngine = new RetrievalEngineImpl();