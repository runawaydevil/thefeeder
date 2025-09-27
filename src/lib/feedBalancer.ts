// Feed Balancer - Distribuição equilibrada de artigos entre feeds
import { FreshRSSArticle } from './freshrss';

export interface BalanceOptions {
  maxPerFeed: number;
  minFeeds: number;
  priorityFeeds?: string[];
  distributionStrategy: 'even' | 'weighted' | 'priority';
}

export interface DistributionReport {
  totalArticles: number;
  uniqueFeeds: number;
  articlesPerFeed: Record<string, number>;
  averageArticlesPerFeed: number;
  maxArticlesInSingleFeed: number;
  minArticlesInSingleFeed: number;
  diversityScore: number; // 0-1, onde 1 é perfeitamente distribuído
}

export interface FeedBalancer {
  balanceArticles(articles: FreshRSSArticle[], options: BalanceOptions): FreshRSSArticle[];
  calculateDistribution(articles: FreshRSSArticle[]): DistributionReport;
  enforceMaxPerFeed(articles: FreshRSSArticle[], maxPerFeed: number): FreshRSSArticle[];
}

class FeedBalancerImpl implements FeedBalancer {
  
  balanceArticles(articles: FreshRSSArticle[], options: BalanceOptions): FreshRSSArticle[] {
    if (articles.length === 0) return [];

    const { maxPerFeed, minFeeds, priorityFeeds = [], distributionStrategy } = options;

    // Agrupar artigos por feed
    const articlesByFeed = this.groupArticlesByFeed(articles);
    const feedIds = Object.keys(articlesByFeed);

    // Verificar se temos feeds suficientes
    if (feedIds.length < minFeeds) {
      console.warn(`Apenas ${feedIds.length} feeds disponíveis, mas ${minFeeds} são necessários`);
    }

    let balancedArticles: FreshRSSArticle[] = [];

    switch (distributionStrategy) {
      case 'even':
        balancedArticles = this.distributeEvenly(articlesByFeed, maxPerFeed);
        break;
      case 'weighted':
        balancedArticles = this.distributeWeighted(articlesByFeed, maxPerFeed);
        break;
      case 'priority':
        balancedArticles = this.distributePriority(articlesByFeed, maxPerFeed, priorityFeeds);
        break;
      default:
        balancedArticles = this.distributeEvenly(articlesByFeed, maxPerFeed);
    }

    // Ordenar por data de publicação
    return balancedArticles.sort((a, b) => b.published - a.published);
  }

  calculateDistribution(articles: FreshRSSArticle[]): DistributionReport {
    if (articles.length === 0) {
      return {
        totalArticles: 0,
        uniqueFeeds: 0,
        articlesPerFeed: {},
        averageArticlesPerFeed: 0,
        maxArticlesInSingleFeed: 0,
        minArticlesInSingleFeed: 0,
        diversityScore: 0
      };
    }

    const articlesByFeed = this.groupArticlesByFeed(articles);
    const feedIds = Object.keys(articlesByFeed);
    const articlesPerFeed: Record<string, number> = {};

    // Contar artigos por feed
    feedIds.forEach(feedId => {
      const feedName = this.getFeedNameFromArticles(articlesByFeed[feedId]);
      articlesPerFeed[feedName] = articlesByFeed[feedId].length;
    });

    const counts = Object.values(articlesPerFeed);
    const totalArticles = articles.length;
    const uniqueFeeds = feedIds.length;
    const averageArticlesPerFeed = totalArticles / uniqueFeeds;
    const maxArticlesInSingleFeed = Math.max(...counts);
    const minArticlesInSingleFeed = Math.min(...counts);

    // Calcular score de diversidade (0-1)
    // Score alto = distribuição mais equilibrada
    const idealDistribution = totalArticles / uniqueFeeds;
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - idealDistribution, 2);
    }, 0) / uniqueFeeds;
    
    // Normalizar score (0-1, onde 1 é perfeito)
    const maxPossibleVariance = Math.pow(totalArticles, 2) / uniqueFeeds;
    const diversityScore = Math.max(0, 1 - (variance / maxPossibleVariance));

    return {
      totalArticles,
      uniqueFeeds,
      articlesPerFeed,
      averageArticlesPerFeed,
      maxArticlesInSingleFeed,
      minArticlesInSingleFeed,
      diversityScore
    };
  }

  enforceMaxPerFeed(articles: FreshRSSArticle[], maxPerFeed: number): FreshRSSArticle[] {
    const articlesByFeed = this.groupArticlesByFeed(articles);
    const limitedArticles: FreshRSSArticle[] = [];

    Object.values(articlesByFeed).forEach(feedArticles => {
      // Ordenar por data e pegar apenas os mais recentes
      const sortedFeedArticles = feedArticles
        .sort((a, b) => b.published - a.published)
        .slice(0, maxPerFeed);
      
      limitedArticles.push(...sortedFeedArticles);
    });

    return limitedArticles.sort((a, b) => b.published - a.published);
  }

  // Métodos privados de distribuição

  private groupArticlesByFeed(articles: FreshRSSArticle[]): Record<string, FreshRSSArticle[]> {
    const grouped: Record<string, FreshRSSArticle[]> = {};

    console.log(`🔍 [FeedBalancer] Agrupando ${articles.length} artigos por feed`);

    articles.forEach((article, index) => {
      const feedId = this.extractFeedId(article);
      if (!grouped[feedId]) {
        grouped[feedId] = [];
        console.log(`📁 [FeedBalancer] Novo grupo criado: ${feedId}`);
      }
      grouped[feedId].push(article);
      
      // Log dos primeiros 3 artigos para debug
      if (index < 3) {
        console.log(`📰 [FeedBalancer] Artigo ${index}: "${article.title.substring(0, 30)}..." -> Feed: ${feedId}`);
        console.log(`   Categories: [${article.categories.join(', ')}]`);
      }
    });

    const feedIds = Object.keys(grouped);
    console.log(`📊 [FeedBalancer] Resultado do agrupamento: ${feedIds.length} feeds únicos`);
    feedIds.forEach(feedId => {
      console.log(`   - ${feedId}: ${grouped[feedId].length} artigos`);
    });

    return grouped;
  }

  private extractFeedId(article: FreshRSSArticle): string {
    // Tentar múltiplas formas de identificar o feed
    
    // 1. Usar feedName se disponível (campo customizado)
    if ((article as any).feedName) {
      return (article as any).feedName;
    }
    
    // 2. Usar a primeira categoria não-vazia
    if (article.categories && article.categories.length > 0 && article.categories[0] !== 'Geral') {
      return article.categories[0];
    }
    
    // 3. Tentar extrair do link/URL
    if (article.link) {
      try {
        const url = new URL(article.link);
        const domain = url.hostname.replace('www.', '');
        if (domain && domain !== 'localhost') {
          return domain;
        }
      } catch (e) {
        // Ignorar erro de URL inválida
      }
    }
    
    // 4. Usar autor se disponível
    if (article.author && article.author !== 'Autor desconhecido') {
      return article.author;
    }
    
    // 5. Fallback para categoria ou unknown
    return article.categories[0] || 'unknown';
  }

  private getFeedNameFromArticles(articles: FreshRSSArticle[]): string {
    return articles[0]?.categories[0] || 'Unknown Feed';
  }

  private distributeEvenly(
    articlesByFeed: Record<string, FreshRSSArticle[]>, 
    maxPerFeed: number
  ): FreshRSSArticle[] {
    const result: FreshRSSArticle[] = [];
    const feedIds = Object.keys(articlesByFeed);

    // Distribuir igualmente entre todos os feeds
    feedIds.forEach(feedId => {
      const feedArticles = articlesByFeed[feedId]
        .sort((a, b) => b.published - a.published)
        .slice(0, maxPerFeed);
      
      result.push(...feedArticles);
    });

    return result;
  }

  private distributeWeighted(
    articlesByFeed: Record<string, FreshRSSArticle[]>, 
    maxPerFeed: number
  ): FreshRSSArticle[] {
    const result: FreshRSSArticle[] = [];
    const feedIds = Object.keys(articlesByFeed);

    // Calcular peso baseado na quantidade de artigos disponíveis
    const totalAvailable = Object.values(articlesByFeed)
      .reduce((sum, articles) => sum + articles.length, 0);

    feedIds.forEach(feedId => {
      const feedArticles = articlesByFeed[feedId];
      const weight = feedArticles.length / totalAvailable;
      const allocatedSlots = Math.min(
        Math.ceil(maxPerFeed * feedIds.length * weight),
        maxPerFeed,
        feedArticles.length
      );

      const selectedArticles = feedArticles
        .sort((a, b) => b.published - a.published)
        .slice(0, allocatedSlots);
      
      result.push(...selectedArticles);
    });

    return result;
  }

  private distributePriority(
    articlesByFeed: Record<string, FreshRSSArticle[]>, 
    maxPerFeed: number,
    priorityFeeds: string[]
  ): FreshRSSArticle[] {
    const result: FreshRSSArticle[] = [];
    const feedIds = Object.keys(articlesByFeed);

    // Primeiro, processar feeds prioritários
    const priorityFeedIds = feedIds.filter(feedId => {
      const feedName = this.getFeedNameFromArticles(articlesByFeed[feedId]);
      return priorityFeeds.includes(feedName);
    });

    const regularFeedIds = feedIds.filter(feedId => !priorityFeedIds.includes(feedId));

    // Dar mais slots para feeds prioritários
    const prioritySlots = Math.floor(maxPerFeed * 1.5);
    const regularSlots = Math.floor(maxPerFeed * 0.75);

    priorityFeedIds.forEach(feedId => {
      const feedArticles = articlesByFeed[feedId]
        .sort((a, b) => b.published - a.published)
        .slice(0, prioritySlots);
      
      result.push(...feedArticles);
    });

    regularFeedIds.forEach(feedId => {
      const feedArticles = articlesByFeed[feedId]
        .sort((a, b) => b.published - a.published)
        .slice(0, regularSlots);
      
      result.push(...feedArticles);
    });

    return result;
  }

  // Método utilitário para validar diversidade mínima
  validateMinimumDiversity(articles: FreshRSSArticle[], minFeeds: number): boolean {
    const distribution = this.calculateDistribution(articles);
    return distribution.uniqueFeeds >= minFeeds;
  }

  // Método para obter recomendações de melhoria
  getBalanceRecommendations(articles: FreshRSSArticle[]): string[] {
    const distribution = this.calculateDistribution(articles);
    const recommendations: string[] = [];

    if (distribution.diversityScore < 0.5) {
      recommendations.push('Distribuição muito desigual entre feeds');
    }

    if (distribution.uniqueFeeds < 3) {
      recommendations.push('Poucos feeds representados - considere adicionar mais fontes');
    }

    if (distribution.maxArticlesInSingleFeed > distribution.averageArticlesPerFeed * 2) {
      recommendations.push('Um feed está dominando - considere limitar artigos por feed');
    }

    if (recommendations.length === 0) {
      recommendations.push('Distribuição adequada entre feeds');
    }

    return recommendations;
  }
}

// Instância singleton do Feed Balancer
export const feedBalancer: FeedBalancer = new FeedBalancerImpl();