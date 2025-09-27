// Diversity Validator - Sistema de validação e métricas de diversidade de feeds
import { FreshRSSArticle } from './freshrss';
import { newsDatabase } from './database';

export interface ValidationReport {
  isValid: boolean;
  diversityScore: number;
  feedCount: number;
  issues: string[];
  recommendations: string[];
  metrics: DiversityMetrics;
}

export interface DiversityMetrics {
  totalArticles: number;
  uniqueFeeds: number;
  articlesPerFeed: Record<string, number>;
  averageArticlesPerFeed: number;
  maxArticlesInSingleFeed: number;
  minArticlesInSingleFeed: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  giniCoefficient: number;
  entropyScore: number;
  balanceIndex: number;
}

export interface DiversityRequirements {
  minFeeds: number;
  maxPerFeed: number;
  minDiversityScore: number;
  maxImbalanceRatio: number;
  requireAllFeedsActive?: boolean;
}

export interface FeedDistributionAnalysis {
  feedName: string;
  articleCount: number;
  percentage: number;
  isOverRepresented: boolean;
  isUnderRepresented: boolean;
  recommendedAdjustment: number;
}

export interface DiversityTrend {
  timestamp: number;
  diversityScore: number;
  feedCount: number;
  totalArticles: number;
  topFeeds: string[];
}

class DiversityValidatorImpl {
  private readonly DIVERSITY_HISTORY_KEY = 'pablo-magazine-diversity-history';
  private readonly MAX_HISTORY_ENTRIES = 100;

  validateFeedDiversity(articles: FreshRSSArticle[], requirements: DiversityRequirements): ValidationReport {
    const metrics = this.calculateDiversityMetrics(articles);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validação 1: Número mínimo de feeds
    if (metrics.uniqueFeeds < requirements.minFeeds) {
      issues.push(`Apenas ${metrics.uniqueFeeds} feeds encontrados, mínimo requerido: ${requirements.minFeeds}`);
      recommendations.push('Adicionar mais feeds RSS ou verificar conectividade dos feeds inativos');
    }

    // Validação 2: Máximo de artigos por feed
    if (metrics.maxArticlesInSingleFeed > requirements.maxPerFeed) {
      const dominantFeed = this.findDominantFeed(articles);
      issues.push(`Feed '${dominantFeed}' tem ${metrics.maxArticlesInSingleFeed} artigos, máximo permitido: ${requirements.maxPerFeed}`);
      recommendations.push(`Limitar artigos do feed '${dominantFeed}' ou implementar balanceamento mais rigoroso`);
    }

    // Validação 3: Score de diversidade mínimo
    if (metrics.balanceIndex < requirements.minDiversityScore) {
      issues.push(`Score de diversidade ${(metrics.balanceIndex * 100).toFixed(1)}% abaixo do mínimo ${(requirements.minDiversityScore * 100).toFixed(1)}%`);
      recommendations.push('Implementar estratégias de balanceamento para melhorar distribuição');
    }

    // Validação 4: Ratio de desequilíbrio
    const imbalanceRatio = metrics.maxArticlesInSingleFeed / Math.max(metrics.minArticlesInSingleFeed, 1);
    if (imbalanceRatio > requirements.maxImbalanceRatio) {
      issues.push(`Desequilíbrio muito alto: ratio ${imbalanceRatio.toFixed(1)}:1, máximo permitido: ${requirements.maxImbalanceRatio}:1`);
      recommendations.push('Redistribuir artigos para reduzir desequilíbrio entre feeds');
    }

    // Validação 5: Coeficiente de variação (medida de dispersão)
    if (metrics.coefficientOfVariation > 0.8) {
      issues.push(`Alta variabilidade na distribuição de artigos (CV: ${(metrics.coefficientOfVariation * 100).toFixed(1)}%)`);
      recommendations.push('Implementar distribuição mais uniforme entre feeds');
    }

    // Validação 6: Índice de Gini (desigualdade)
    if (metrics.giniCoefficient > 0.6) {
      issues.push(`Alta desigualdade na distribuição (Gini: ${(metrics.giniCoefficient * 100).toFixed(1)}%)`);
      recommendations.push('Reduzir concentração de artigos em poucos feeds');
    }

    // Gerar recomendações adicionais baseadas nas métricas
    this.generateAdditionalRecommendations(metrics, recommendations);

    const isValid = issues.length === 0;

    return {
      isValid,
      diversityScore: metrics.balanceIndex,
      feedCount: metrics.uniqueFeeds,
      issues,
      recommendations,
      metrics
    };
  }

  calculateDiversityMetrics(articles: FreshRSSArticle[]): DiversityMetrics {
    if (articles.length === 0) {
      return this.getEmptyMetrics();
    }

    // Contar artigos por feed
    const feedCounts: Record<string, number> = {};
    articles.forEach(article => {
      const feedName = article.categories[0] || 'Unknown';
      feedCounts[feedName] = (feedCounts[feedName] || 0) + 1;
    });

    const feedNames = Object.keys(feedCounts);
    const counts = Object.values(feedCounts);
    const totalArticles = articles.length;
    const uniqueFeeds = feedNames.length;

    // Métricas básicas
    const averageArticlesPerFeed = totalArticles / uniqueFeeds;
    const maxArticlesInSingleFeed = Math.max(...counts);
    const minArticlesInSingleFeed = Math.min(...counts);

    // Desvio padrão
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - averageArticlesPerFeed, 2);
    }, 0) / uniqueFeeds;
    const standardDeviation = Math.sqrt(variance);

    // Coeficiente de variação
    const coefficientOfVariation = averageArticlesPerFeed > 0 ? standardDeviation / averageArticlesPerFeed : 0;

    // Coeficiente de Gini (medida de desigualdade)
    const giniCoefficient = this.calculateGiniCoefficient(counts);

    // Score de entropia (medida de diversidade informacional)
    const entropyScore = this.calculateEntropyScore(counts, totalArticles);

    // Índice de balanceamento (0-1, onde 1 é perfeitamente balanceado)
    const balanceIndex = this.calculateBalanceIndex(counts, totalArticles);

    return {
      totalArticles,
      uniqueFeeds,
      articlesPerFeed: feedCounts,
      averageArticlesPerFeed,
      maxArticlesInSingleFeed,
      minArticlesInSingleFeed,
      standardDeviation,
      coefficientOfVariation,
      giniCoefficient,
      entropyScore,
      balanceIndex
    };
  }

  analyzeFeedDistribution(articles: FreshRSSArticle[]): FeedDistributionAnalysis[] {
    const metrics = this.calculateDiversityMetrics(articles);
    const analysis: FeedDistributionAnalysis[] = [];

    Object.entries(metrics.articlesPerFeed).forEach(([feedName, count]) => {
      const percentage = (count / metrics.totalArticles) * 100;
      const expectedPercentage = 100 / metrics.uniqueFeeds;
      const deviation = Math.abs(percentage - expectedPercentage);

      const isOverRepresented = percentage > expectedPercentage * 1.5;
      const isUnderRepresented = percentage < expectedPercentage * 0.5;

      let recommendedAdjustment = 0;
      if (isOverRepresented) {
        recommendedAdjustment = Math.floor(count - (metrics.totalArticles / metrics.uniqueFeeds));
      } else if (isUnderRepresented) {
        recommendedAdjustment = Math.ceil((metrics.totalArticles / metrics.uniqueFeeds) - count);
      }

      analysis.push({
        feedName,
        articleCount: count,
        percentage,
        isOverRepresented,
        isUnderRepresented,
        recommendedAdjustment
      });
    });

    // Ordenar por número de artigos (decrescente)
    return analysis.sort((a, b) => b.articleCount - a.articleCount);
  }

  trackDiversityTrend(): void {
    const currentMetrics = this.calculateDiversityMetrics(
      newsDatabase.getArticles(1, 100).map(this.convertStoredToFreshRSS)
    );

    const trend: DiversityTrend = {
      timestamp: Date.now(),
      diversityScore: currentMetrics.balanceIndex,
      feedCount: currentMetrics.uniqueFeeds,
      totalArticles: currentMetrics.totalArticles,
      topFeeds: Object.entries(currentMetrics.articlesPerFeed)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name)
    };

    const history = this.getDiversityHistory();
    history.push(trend);

    // Manter apenas as últimas entradas
    if (history.length > this.MAX_HISTORY_ENTRIES) {
      history.splice(0, history.length - this.MAX_HISTORY_ENTRIES);
    }

    localStorage.setItem(this.DIVERSITY_HISTORY_KEY, JSON.stringify(history));
  }

  getDiversityHistory(): DiversityTrend[] {
    const data = localStorage.getItem(this.DIVERSITY_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  }

  getDiversityTrendAnalysis(days: number = 7): {
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
    scoreChange: number;
    feedCountChange: number;
  } {
    const history = this.getDiversityHistory();
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(entry => entry.timestamp >= cutoffTime);

    if (recentHistory.length < 2) {
      return {
        trend: 'stable',
        averageScore: recentHistory[0]?.diversityScore || 0,
        scoreChange: 0,
        feedCountChange: 0
      };
    }

    const firstEntry = recentHistory[0];
    const lastEntry = recentHistory[recentHistory.length - 1];
    const averageScore = recentHistory.reduce((sum, entry) => sum + entry.diversityScore, 0) / recentHistory.length;

    const scoreChange = lastEntry.diversityScore - firstEntry.diversityScore;
    const feedCountChange = lastEntry.feedCount - firstEntry.feedCount;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (scoreChange > 0.05) trend = 'improving';
    else if (scoreChange < -0.05) trend = 'declining';

    return {
      trend,
      averageScore,
      scoreChange,
      feedCountChange
    };
  }

  // Métodos privados

  private getEmptyMetrics(): DiversityMetrics {
    return {
      totalArticles: 0,
      uniqueFeeds: 0,
      articlesPerFeed: {},
      averageArticlesPerFeed: 0,
      maxArticlesInSingleFeed: 0,
      minArticlesInSingleFeed: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      giniCoefficient: 0,
      entropyScore: 0,
      balanceIndex: 0
    };
  }

  private findDominantFeed(articles: FreshRSSArticle[]): string {
    const feedCounts: Record<string, number> = {};
    articles.forEach(article => {
      const feedName = article.categories[0] || 'Unknown';
      feedCounts[feedName] = (feedCounts[feedName] || 0) + 1;
    });

    return Object.entries(feedCounts)
      .reduce((max, [name, count]) => count > max.count ? { name, count } : max, { name: 'Unknown', count: 0 })
      .name;
  }

  private calculateGiniCoefficient(counts: number[]): number {
    if (counts.length === 0) return 0;

    const sortedCounts = [...counts].sort((a, b) => a - b);
    const n = sortedCounts.length;
    const sum = sortedCounts.reduce((a, b) => a + b, 0);

    if (sum === 0) return 0;

    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sortedCounts[i];
    }

    return gini / (n * sum);
  }

  private calculateEntropyScore(counts: number[], total: number): number {
    if (total === 0) return 0;

    let entropy = 0;
    counts.forEach(count => {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    });

    // Normalizar pela entropia máxima possível
    const maxEntropy = Math.log2(counts.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculateBalanceIndex(counts: number[], total: number): number {
    if (counts.length === 0 || total === 0) return 0;

    const idealDistribution = total / counts.length;
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - idealDistribution, 2);
    }, 0) / counts.length;

    // Normalizar (0-1, onde 1 é perfeitamente balanceado)
    const maxPossibleVariance = Math.pow(total, 2) / counts.length;
    return Math.max(0, 1 - (variance / maxPossibleVariance));
  }

  private generateAdditionalRecommendations(metrics: DiversityMetrics, recommendations: string[]): void {
    // Recomendação baseada na entropia
    if (metrics.entropyScore < 0.7) {
      recommendations.push('Aumentar diversidade informacional adicionando feeds de diferentes tópicos');
    }

    // Recomendação baseada no número de feeds
    if (metrics.uniqueFeeds < 5) {
      recommendations.push('Considerar adicionar mais feeds RSS para aumentar diversidade');
    }

    // Recomendação baseada na distribuição
    if (metrics.coefficientOfVariation > 0.5) {
      recommendations.push('Implementar algoritmo de distribuição mais uniforme');
    }

    // Recomendação para feeds com poucos artigos
    const lowActivityFeeds = Object.entries(metrics.articlesPerFeed)
      .filter(([, count]) => count < metrics.averageArticlesPerFeed * 0.3)
      .map(([name]) => name);

    if (lowActivityFeeds.length > 0) {
      recommendations.push(`Verificar conectividade dos feeds com baixa atividade: ${lowActivityFeeds.join(', ')}`);
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
}

// Instância singleton do Diversity Validator
export const diversityValidator = new DiversityValidatorImpl();