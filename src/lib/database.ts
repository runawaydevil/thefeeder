// SQLite não funciona no frontend, vamos usar localStorage como alternativa
// import Database from 'better-sqlite3';
// import path from 'path';

// Interface para artigo no banco de dados
export interface StoredArticle {
  id: string;
  title: string;
  author: string;
  content: string;
  excerpt: string;
  link: string;
  published: number;
  updated: number;
  categories: string;
  tags: string;
  imageUrl?: string;
  readingTime: string;
  category: string;
  createdAt: number;
  isRead: boolean;
  isFavorite: boolean;
  // Enhanced fields for feed diversity
  feedId?: string;
  feedName?: string;
  retrievalStrategy?: string;
  cacheTimestamp?: number;
}

// Feed Metadata Interface
export interface FeedMetadata {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastFetch: number;
  lastSuccessfulFetch: number;
  totalArticles: number;
  recentArticles: number;
  errorCount: number;
  averageArticlesPerDay: number;
  healthScore: number;
}

// Enhanced Sync Status Interface
export interface EnhancedSyncStatus {
  lastSync: number;
  nextSync: number;
  isSyncing: boolean;
  currentStrategy: string;
  feedsProcessed: number;
  totalFeeds: number;
  articlesFound: number;
  newArticles: number;
  errors: SyncError[];
  diversityScore: number;
}

export interface SyncError {
  feedId: string;
  feedName: string;
  errorMessage: string;
  timestamp: number;
  strategy: string;
}

// Cache Retrieval Options
export interface CacheRetrievalOptions {
  page?: number;
  limit?: number;
  minFeeds?: number;
  maxPerFeed?: number;
  strategy?: string;
}

class NewsDatabase {
  private storageKey = 'pablo-magazine-articles';
  private settingsKey = 'pablo-magazine-settings';
  private feedMetadataKey = 'pablo-magazine-feed-metadata';
  private syncStatusKey = 'pablo-magazine-sync-status';

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    // Limpar dados de teste se existirem
    const existingData = localStorage.getItem(this.storageKey);
    if (existingData) {
      try {
        const articles = JSON.parse(existingData);
        // Remover artigos de teste
        const cleanArticles = articles.filter((article: { id: string; title: string }) => 
          !article.id.startsWith('test-') && 
          article.title !== 'Artigo de Teste'
        );
        localStorage.setItem(this.storageKey, JSON.stringify(cleanArticles));
        // Artigos de teste removidos
      } catch (error) {
        console.error('Erro ao limpar dados de teste:', error);
        localStorage.setItem(this.storageKey, JSON.stringify([]));
      }
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(this.settingsKey)) {
      localStorage.setItem(this.settingsKey, JSON.stringify({}));
    }
  }

  private setArticles(articles: StoredArticle[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(articles));
  }

  // Inserir ou atualizar artigo (sem duplicatas)
  insertOrUpdateArticle(article: StoredArticle): boolean {
    const articles = this.getAllArticles();
    // Inserindo artigo no banco
    
    // Verificar duplicatas por ID ou por link (dupla proteção)
    const existingIndex = articles.findIndex(a => 
      a.id === article.id || (a.link && article.link && a.link === article.link)
    );
    
    if (existingIndex >= 0) {
      // Artigo já existe
      // Verificar se realmente precisa atualizar
      const existing = articles[existingIndex];
      if (existing.updated >= article.updated) {
        // Artigo já existe e não precisa ser atualizado
        // Artigo não precisa ser atualizado
        return false;
      }
      // Atualizar artigo existente mantendo status de leitura
      articles[existingIndex] = {
        ...article,
        isRead: existing.isRead,
        isFavorite: existing.isFavorite
      };
      this.setArticles(articles);
      // Artigo atualizado
      return false; // Não é um novo artigo
    } else {
      // Verificar se não há artigo com título muito similar (proteção extra)
      const similarArticle = articles.find(a => 
        a.title.toLowerCase().trim() === article.title.toLowerCase().trim() &&
        Math.abs(a.published - article.published) < 3600 // Mesmo título e publicado na mesma hora
      );
      
      if (similarArticle) {
        console.log('🔄 Artigo similar encontrado, ignorando duplicata:', article.title);
        return false;
      }
      
      // Adicionar novo artigo
      articles.push(article);
      this.setArticles(articles);
      console.log('✅ Novo artigo adicionado ao banco');
      return true; // É um novo artigo
    }
  }

  // Buscar artigos com paginação
  getArticles(page: number = 1, limit: number = 20): StoredArticle[] {
    const offset = (page - 1) * limit;
    const allArticles = this.getAllArticles();
    
    // Buscando artigos com paginação
    
    // Ordenar por data de publicação (mais recentes primeiro)
    const sortedArticles = allArticles.sort((a, b) => b.published - a.published);
    
    // Aplicar paginação
    const paginatedArticles = sortedArticles.slice(offset, offset + limit);
    // Artigos paginados
    
    return paginatedArticles;
  }

  // Buscar todos os artigos (método privado)
  private getAllArticles(): StoredArticle[] {
    const data = localStorage.getItem(this.storageKey);
    const articles = data ? JSON.parse(data) : [];
    return articles;
  }

  // Buscar artigo por ID
  getArticleById(id: string): StoredArticle | null {
    const articles = this.getAllArticles();
    return articles.find(article => article.id === id) || null;
  }

  // Contar total de artigos
  getTotalArticles(): number {
    const articles = this.getAllArticles();
    return articles.length;
  }

  // Buscar artigos não lidos
  getUnreadArticles(page: number = 1, limit: number = 20): StoredArticle[] {
    const offset = (page - 1) * limit;
    const allArticles = this.getAllArticles();
    
    // Filtrar artigos não lidos e ordenar
    const unreadArticles = allArticles
      .filter(article => !article.isRead)
      .sort((a, b) => b.published - a.published);
    
    return unreadArticles.slice(offset, offset + limit);
  }

  // Buscar artigos favoritos
  getFavoriteArticles(page: number = 1, limit: number = 20): StoredArticle[] {
    const offset = (page - 1) * limit;
    const allArticles = this.getAllArticles();
    
    // Filtrar artigos favoritos e ordenar
    const favoriteArticles = allArticles
      .filter(article => article.isFavorite)
      .sort((a, b) => b.published - a.published);
    
    return favoriteArticles.slice(offset, offset + limit);
  }

  // Marcar artigo como lido
  markAsRead(id: string): void {
    const articles = this.getAllArticles();
    const articleIndex = articles.findIndex(article => article.id === id);
    
    if (articleIndex >= 0) {
      articles[articleIndex].isRead = true;
      this.setArticles(articles);
    }
  }

  // Marcar artigo como favorito
  toggleFavorite(id: string): boolean {
    const articles = this.getAllArticles();
    const articleIndex = articles.findIndex(article => article.id === id);
    
    if (articleIndex >= 0) {
      const newFavoriteStatus = !articles[articleIndex].isFavorite;
      articles[articleIndex].isFavorite = newFavoriteStatus;
      this.setArticles(articles);
      return newFavoriteStatus;
    }
    
    return false;
  }

  // Limpar artigos antigos (manter apenas os últimos 1000)
  cleanupOldArticles(): void {
    const articles = this.getAllArticles();
    const sortedArticles = articles.sort((a, b) => b.published - a.published);
    const articlesToKeep = sortedArticles.slice(0, 1000);
    
    if (articlesToKeep.length < articles.length) {
      this.setArticles(articlesToKeep);
      console.log(`Removidos ${articles.length - articlesToKeep.length} artigos antigos`);
    }
  }

  // Salvar configuração
  setSetting(key: string, value: string): void {
    const settings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
    settings[key] = value;
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }

  // Buscar configuração
  getSetting(key: string): string | null {
    const settings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
    return settings[key] || null;
  }

  // Limpar todos os dados (útil para debug)
  clearAllData(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.settingsKey);
    localStorage.removeItem(this.feedMetadataKey);
    localStorage.removeItem(this.syncStatusKey);
    // Dados limpos
    this.initDatabase();
  }

  // Enhanced Cache Methods - Feed Metadata

  updateFeedMetadata(feedId: string, metadata: FeedMetadata): void {
    const allMetadata = this.getAllFeedMetadata();
    allMetadata[feedId] = metadata;
    localStorage.setItem(this.feedMetadataKey, JSON.stringify(allMetadata));
  }

  getFeedMetadata(feedId: string): FeedMetadata | null {
    const allMetadata = this.getAllFeedMetadata();
    return allMetadata[feedId] || null;
  }

  getAllFeedMetadata(): Record<string, FeedMetadata> {
    const data = localStorage.getItem(this.feedMetadataKey);
    return data ? JSON.parse(data) : {};
  }

  // Enhanced Cache Methods - Sync Status

  updateSyncStatus(status: EnhancedSyncStatus): void {
    localStorage.setItem(this.syncStatusKey, JSON.stringify(status));
  }

  getEnhancedSyncStatus(): EnhancedSyncStatus | null {
    const data = localStorage.getItem(this.syncStatusKey);
    return data ? JSON.parse(data) : null;
  }

  // Enhanced Cache Methods - Articles with Feed Info

  insertOrUpdateArticleWithFeedInfo(article: StoredArticle, feedId: string, feedName: string, strategy: string): boolean {
    const enhancedArticle: StoredArticle = {
      ...article,
      feedId,
      feedName,
      retrievalStrategy: strategy,
      cacheTimestamp: Date.now()
    };

    return this.insertOrUpdateArticle(enhancedArticle);
  }

  getArticlesWithFeedBalance(options: CacheRetrievalOptions): StoredArticle[] {
    const { page = 1, limit = 20, minFeeds = 3, maxPerFeed = 10 } = options;
    
    return this.getArticlesWithSmartPagination({
      page,
      limit,
      minFeeds,
      maxPerFeed,
      strategy: 'balanced'
    });
  }

  // Paginação inteligente com múltiplas estratégias
  getArticlesWithSmartPagination(options: CacheRetrievalOptions & { 
    strategy?: 'balanced' | 'round-robin' | 'weighted' | 'chronological';
  }): StoredArticle[] {
    const { 
      page = 1, 
      limit = 20, 
      minFeeds = 3, 
      maxPerFeed = 10,
      strategy = 'balanced'
    } = options;

    const allArticles = this.getAllArticles();
    if (allArticles.length === 0) return [];

    switch (strategy) {
      case 'round-robin':
        return this.getRoundRobinPagination(allArticles, page, limit, maxPerFeed);
      
      case 'weighted':
        return this.getWeightedPagination(allArticles, page, limit, minFeeds, maxPerFeed);
      
      case 'chronological':
        return this.getChronologicalPagination(allArticles, page, limit);
      
      case 'balanced':
      default:
        return this.getBalancedPagination(allArticles, page, limit, minFeeds, maxPerFeed);
    }
  }

  // Estratégia 1: Paginação balanceada (distribuição uniforme)
  private getBalancedPagination(
    allArticles: StoredArticle[], 
    page: number, 
    limit: number, 
    minFeeds: number, 
    maxPerFeed: number
  ): StoredArticle[] {
    // Agrupar artigos por feed
    const articlesByFeed = this.groupArticlesByFeed(allArticles);
    const feedKeys = Object.keys(articlesByFeed);

    if (feedKeys.length === 0) return [];

    // Calcular offset global para paginação
    const globalOffset = (page - 1) * limit;
    
    // Distribuir artigos equilibradamente considerando todas as páginas
    const articlesPerFeedPerPage = Math.min(maxPerFeed, Math.floor(limit / Math.min(feedKeys.length, minFeeds)));
    const balancedArticles: StoredArticle[] = [];

    // Para cada feed, calcular quantos artigos já foram "consumidos" em páginas anteriores
    feedKeys.forEach(feedKey => {
      const feedArticles = articlesByFeed[feedKey].sort((a, b) => b.published - a.published);
      const feedOffset = Math.floor(globalOffset / feedKeys.length);
      const feedLimit = articlesPerFeedPerPage;
      
      const feedPageArticles = feedArticles.slice(feedOffset, feedOffset + feedLimit);
      balancedArticles.push(...feedPageArticles);
    });

    // Se ainda temos espaço, preencher com artigos adicionais
    const remainingSlots = limit - balancedArticles.length;
    if (remainingSlots > 0) {
      const additionalArticles: StoredArticle[] = [];
      
      feedKeys.forEach(feedKey => {
        const feedArticles = articlesByFeed[feedKey].sort((a, b) => b.published - a.published);
        const feedOffset = Math.floor(globalOffset / feedKeys.length) + articlesPerFeedPerPage;
        const additionalFromFeed = Math.ceil(remainingSlots / feedKeys.length);
        
        const extraArticles = feedArticles.slice(feedOffset, feedOffset + additionalFromFeed);
        additionalArticles.push(...extraArticles);
      });

      balancedArticles.push(...additionalArticles.slice(0, remainingSlots));
    }

    // Ordenar por data e retornar
    return balancedArticles.sort((a, b) => b.published - a.published).slice(0, limit);
  }

  // Estratégia 2: Round-robin (alternância entre feeds)
  private getRoundRobinPagination(
    allArticles: StoredArticle[], 
    page: number, 
    limit: number, 
    maxPerFeed: number
  ): StoredArticle[] {
    const articlesByFeed = this.groupArticlesByFeed(allArticles);
    const feedKeys = Object.keys(articlesByFeed);
    
    if (feedKeys.length === 0) return [];

    // Ordenar artigos de cada feed por data
    feedKeys.forEach(feedKey => {
      articlesByFeed[feedKey].sort((a, b) => b.published - a.published);
    });

    const result: StoredArticle[] = [];
    const globalOffset = (page - 1) * limit;
    let currentIndex = 0;

    // Implementar round-robin considerando offset global
    const feedCounters: Record<string, number> = {};
    feedKeys.forEach(key => {
      feedCounters[key] = Math.floor(globalOffset / feedKeys.length);
    });

    while (result.length < limit && currentIndex < limit * 10) { // Limite de segurança
      for (const feedKey of feedKeys) {
        if (result.length >= limit) break;
        
        const feedArticles = articlesByFeed[feedKey];
        const feedIndex = feedCounters[feedKey];
        
        if (feedIndex < feedArticles.length && feedCounters[feedKey] < maxPerFeed + Math.floor(globalOffset / feedKeys.length)) {
          result.push(feedArticles[feedIndex]);
          feedCounters[feedKey]++;
        }
      }
      currentIndex++;
    }

    return result.sort((a, b) => b.published - a.published);
  }

  // Estratégia 3: Paginação ponderada (baseada na atividade do feed)
  private getWeightedPagination(
    allArticles: StoredArticle[], 
    page: number, 
    limit: number, 
    minFeeds: number, 
    maxPerFeed: number
  ): StoredArticle[] {
    const articlesByFeed = this.groupArticlesByFeed(allArticles);
    const feedKeys = Object.keys(articlesByFeed);
    
    if (feedKeys.length === 0) return [];

    // Calcular pesos baseados na quantidade de artigos de cada feed
    const totalArticles = allArticles.length;
    const feedWeights: Record<string, number> = {};
    
    feedKeys.forEach(feedKey => {
      const feedArticleCount = articlesByFeed[feedKey].length;
      feedWeights[feedKey] = feedArticleCount / totalArticles;
    });

    const globalOffset = (page - 1) * limit;
    const result: StoredArticle[] = [];

    // Distribuir slots baseado nos pesos
    feedKeys.forEach(feedKey => {
      const feedArticles = articlesByFeed[feedKey].sort((a, b) => b.published - a.published);
      const weight = feedWeights[feedKey];
      const allocatedSlots = Math.min(
        Math.ceil(limit * weight),
        maxPerFeed,
        feedArticles.length
      );

      const feedOffset = Math.floor(globalOffset * weight);
      const feedPageArticles = feedArticles.slice(feedOffset, feedOffset + allocatedSlots);
      
      result.push(...feedPageArticles);
    });

    return result.sort((a, b) => b.published - a.published).slice(0, limit);
  }

  // Estratégia 4: Paginação cronológica simples (fallback)
  private getChronologicalPagination(
    allArticles: StoredArticle[], 
    page: number, 
    limit: number
  ): StoredArticle[] {
    const sortedArticles = allArticles.sort((a, b) => b.published - a.published);
    const offset = (page - 1) * limit;
    
    return sortedArticles.slice(offset, offset + limit);
  }

  // Método auxiliar para agrupar artigos por feed
  private groupArticlesByFeed(articles: StoredArticle[]): Record<string, StoredArticle[]> {
    const grouped: Record<string, StoredArticle[]> = {};
    
    articles.forEach(article => {
      const feedKey = article.feedName || article.category || 'Unknown';
      if (!grouped[feedKey]) {
        grouped[feedKey] = [];
      }
      grouped[feedKey].push(article);
    });

    return grouped;
  }

  // Método para calcular estatísticas de paginação
  getPaginationStats(page: number, limit: number, strategy: string = 'balanced'): {
    totalArticles: number;
    totalPages: number;
    currentPage: number;
    articlesInPage: number;
    feedsInPage: number;
    diversityScore: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } {
    const totalArticles = this.getTotalArticles();
    const totalPages = Math.ceil(totalArticles / limit);
    
    const pageArticles = this.getArticlesWithSmartPagination({
      page,
      limit,
      strategy: strategy as 'balanced' | 'round-robin' | 'weighted' | 'chronological'
    });

    const feedsInPage = new Set(pageArticles.map(a => a.feedName || a.category)).size;
    const diversityScore = this.calculatePageDiversityScore(pageArticles);

    return {
      totalArticles,
      totalPages,
      currentPage: page,
      articlesInPage: pageArticles.length,
      feedsInPage,
      diversityScore,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  // Calcular score de diversidade para uma página específica
  private calculatePageDiversityScore(articles: StoredArticle[]): number {
    if (articles.length === 0) return 0;

    const feedCounts: Record<string, number> = {};
    articles.forEach(article => {
      const feedKey = article.feedName || article.category || 'Unknown';
      feedCounts[feedKey] = (feedCounts[feedKey] || 0) + 1;
    });

    const feedKeys = Object.keys(feedCounts);
    const counts = Object.values(feedCounts);
    
    if (feedKeys.length <= 1) return 0;

    // Calcular distribuição ideal vs real para a página
    const totalArticles = articles.length;
    const idealDistribution = totalArticles / feedKeys.length;
    
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - idealDistribution, 2);
    }, 0) / feedKeys.length;
    
    // Normalizar score (0-1)
    const maxPossibleVariance = Math.pow(totalArticles, 2) / feedKeys.length;
    return Math.max(0, 1 - (variance / maxPossibleVariance));
  }

  // Método para calcular score de diversidade
  calculateDiversityScore(): number {
    const allArticles = this.getAllArticles();
    if (allArticles.length === 0) return 0;

    // Contar artigos por feed
    const feedCounts: Record<string, number> = {};
    allArticles.forEach(article => {
      const feedKey = article.feedName || article.category || 'Unknown';
      feedCounts[feedKey] = (feedCounts[feedKey] || 0) + 1;
    });

    const feedKeys = Object.keys(feedCounts);
    const counts = Object.values(feedCounts);
    
    if (feedKeys.length <= 1) return 0;

    // Calcular distribuição ideal vs real
    const totalArticles = allArticles.length;
    const idealDistribution = totalArticles / feedKeys.length;
    
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - idealDistribution, 2);
    }, 0) / feedKeys.length;
    
    // Normalizar score (0-1)
    const maxPossibleVariance = Math.pow(totalArticles, 2) / feedKeys.length;
    return Math.max(0, 1 - (variance / maxPossibleVariance));
  }

  // Método para obter estatísticas de feeds
  getFeedStatistics(): Record<string, { count: number; percentage: number; lastUpdate: number }> {
    const allArticles = this.getAllArticles();
    const feedStats: Record<string, { count: number; percentage: number; lastUpdate: number }> = {};

    if (allArticles.length === 0) return feedStats;

    // Contar artigos e encontrar última atualização por feed
    allArticles.forEach(article => {
      const feedKey = article.feedName || article.category || 'Unknown';
      
      if (!feedStats[feedKey]) {
        feedStats[feedKey] = { count: 0, percentage: 0, lastUpdate: 0 };
      }
      
      feedStats[feedKey].count++;
      feedStats[feedKey].lastUpdate = Math.max(feedStats[feedKey].lastUpdate, article.published);
    });

    // Calcular percentuais
    const totalArticles = allArticles.length;
    Object.keys(feedStats).forEach(feedKey => {
      feedStats[feedKey].percentage = (feedStats[feedKey].count / totalArticles) * 100;
    });

    return feedStats;
  }

  // Limpar dados antigos com preservação de diversidade
  cleanupOldArticlesWithDiversity(): void {
    const articles = this.getAllArticles();
    if (articles.length <= 1000) return;

    // Agrupar por feed
    const articlesByFeed: Record<string, StoredArticle[]> = {};
    articles.forEach(article => {
      const feedKey = article.feedName || article.category || 'Unknown';
      if (!articlesByFeed[feedKey]) {
        articlesByFeed[feedKey] = [];
      }
      articlesByFeed[feedKey].push(article);
    });

    // Manter proporção de artigos por feed
    const feedKeys = Object.keys(articlesByFeed);
    const articlesPerFeed = Math.floor(1000 / feedKeys.length);
    const articlesToKeep: StoredArticle[] = [];

    feedKeys.forEach(feedKey => {
      const feedArticles = articlesByFeed[feedKey]
        .sort((a, b) => b.published - a.published)
        .slice(0, articlesPerFeed);
      
      articlesToKeep.push(...feedArticles);
    });

    // Se ainda temos espaço, adicionar mais artigos dos feeds maiores
    const remainingSlots = 1000 - articlesToKeep.length;
    if (remainingSlots > 0) {
      const additionalArticles: StoredArticle[] = [];
      
      feedKeys.forEach(feedKey => {
        const remainingFeedArticles = articlesByFeed[feedKey]
          .sort((a, b) => b.published - a.published)
          .slice(articlesPerFeed);
        
        additionalArticles.push(...remainingFeedArticles);
      });

      articlesToKeep.push(...additionalArticles
        .sort((a, b) => b.published - a.published)
        .slice(0, remainingSlots)
      );
    }

    this.setArticles(articlesToKeep);
    console.log(`Limpeza com diversidade: mantidos ${articlesToKeep.length} artigos de ${feedKeys.length} feeds`);
  }

  // Fechar conexão (não necessário com localStorage)
  close(): void {
    // localStorage não precisa de fechamento
  }
}

// Instância singleton do banco de dados
export const newsDatabase = new NewsDatabase();
