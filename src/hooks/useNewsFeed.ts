import { useState, useEffect, useCallback } from 'react';
import { newsDatabase, StoredArticle } from '@/lib/database';
import { syncService, formatTimeUntilNextSync } from '@/lib/syncService';

export interface ProcessedArticle {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  publishedDate: string;
  readingTime: string;
  imageUrl?: string;
  category: string;
  href: string;
  content: string;
  tags: string[];
  isRead: boolean;
  isFavorite: boolean;
}

const processStoredArticle = (article: StoredArticle): ProcessedArticle => {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    author: article.author,
    publishedDate: new Date(article.published * 1000).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    readingTime: article.readingTime,
    imageUrl: article.imageUrl || undefined,
    category: article.category,
    href: article.link,
    content: article.content,
    tags: typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags,
    isRead: article.isRead,
    isFavorite: article.isFavorite,
  };
};

export const useNewsFeed = (page: number = 1, limit: number = 20, strategy: 'balanced' | 'round-robin' | 'weighted' | 'chronological' = 'balanced') => {
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const [paginationStats, setPaginationStats] = useState<{
    totalArticles: number;
    totalPages: number;
    currentPage: number;
    articlesInPage: number;
    feedsInPage: number;
    diversityScore: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [feedHealthStatus, setFeedHealthStatus] = useState<{
    totalFeeds: number;
    activeFeeds: number;
    failedFeeds: unknown[];
    lastUpdate: number;
    articlesPerFeed: Record<string, number>;
    diversityScore: number;
    recommendations: string[];
  } | null>(null);
  const [diversityMetrics, setDiversityMetrics] = useState<{
    diversityScore: number;
    feedsProcessed: number;
    totalFeeds: number;
    articlesFound: number;
    newArticles: number;
    errors: unknown[];
  } | null>(null);

  // Hook inicializado

  const loadArticles = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      // Usar paginação inteligente com balanceamento
      const storedArticles = strategy === 'chronological' 
        ? newsDatabase.getArticles(page, limit)
        : newsDatabase.getArticlesWithSmartPagination({
            page,
            limit,
            minFeeds: 3,
            maxPerFeed: Math.ceil(limit / 3),
            strategy
          });

      const processedArticles = storedArticles.map(processStoredArticle);
      
      // Obter estatísticas de paginação
      const stats = newsDatabase.getPaginationStats(page, limit, strategy);
      setPaginationStats(stats);
      
      // Obter métricas de diversidade
      try {
        const currentSyncStatus = syncService.getSyncStatus();
        setSyncStatus(currentSyncStatus);
        
        // Se há informações de diversidade no sync status, usar elas
        if (currentSyncStatus.diversityScore !== undefined) {
          setDiversityMetrics({
            diversityScore: currentSyncStatus.diversityScore,
            feedsProcessed: currentSyncStatus.feedsProcessed,
            totalFeeds: currentSyncStatus.totalFeeds,
            articlesFound: currentSyncStatus.articlesFound,
            newArticles: currentSyncStatus.newArticles,
            errors: currentSyncStatus.errors || []
          });
        }
      } catch (err) {
        console.warn('Não foi possível obter métricas de diversidade:', err);
      }
      
      setArticles(processedArticles);
      setTotalPages(stats.totalPages);
      setTotalArticles(stats.totalArticles);
      
    } catch (err) {
      console.error('Erro ao carregar artigos:', err);
      setError('Erro ao carregar artigos do banco local');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, strategy]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await syncService.forceSync();
      
      if (result.success) {
        loadArticles();
        setSyncStatus(syncService.getSyncStatus());
      } else {
        setError(result.error || 'Erro ao sincronizar');
      }
    } catch (err) {
      console.error('Erro ao atualizar feed:', err);
      setError('Erro ao atualizar feed');
    } finally {
      setIsLoading(false);
    }
  }, [loadArticles]);

  const markAsRead = useCallback((articleId: string) => {
    newsDatabase.markAsRead(articleId);
    setArticles(prev => 
      prev.map(article => 
        article.id === articleId 
          ? { ...article, isRead: true }
          : article
      )
    );
  }, []);

  const toggleFavorite = useCallback((articleId: string) => {
    const newFavoriteStatus = newsDatabase.toggleFavorite(articleId);
    setArticles(prev => 
      prev.map(article => 
        article.id === articleId 
          ? { ...article, isFavorite: newFavoriteStatus }
          : article
      )
    );
  }, []);

  const refreshFeedHealth = useCallback(async () => {
    try {
      const healthReport = await syncService.getFeedHealthReport();
      setFeedHealthStatus(healthReport);
    } catch (err) {
      console.warn('Não foi possível obter status de saúde dos feeds:', err);
    }
  }, []);

  const refreshSpecificFeeds = useCallback(async (feedIds: string[]) => {
    try {
      const result = await syncService.refreshSpecificFeeds(feedIds);
      if (result.success) {
        await refreshFeedHealth();
        loadArticles();
      }
      return result;
    } catch (err) {
      console.error('Erro ao atualizar feeds específicos:', err);
      return { success: false, feedsRefreshed: 0, articlesFound: 0, errors: [] };
    }
  }, [refreshFeedHealth, loadArticles]);

  useEffect(() => {
    loadArticles();
    
    // Se não há artigos, forçar um sync
    const total = newsDatabase.getTotalArticles();
    if (total === 0) {
      setTimeout(() => {
        refresh();
      }, 2000);
    }
  }, [loadArticles, refresh]);

  // Atualizar status do sync periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 60000); // A cada minuto

    return () => clearInterval(interval);
  }, []);

  return {
    articles,
    isLoading,
    error,
    totalPages,
    totalArticles,
    currentPage: page,
    syncStatus,
    paginationStats,
    feedHealthStatus,
    diversityMetrics,
    refresh,
    markAsRead,
    toggleFavorite,
    refreshFeedHealth,
    refreshSpecificFeeds,
    formatTimeUntilNextSync,
  };
};

// Hook para buscar artigos não lidos
export const useUnreadFeed = (page: number = 1, limit: number = 20) => {
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);

  const loadUnreadArticles = useCallback(() => {
    try {
      setIsLoading(true);
      const storedArticles = newsDatabase.getUnreadArticles(page, limit);
      const processedArticles = storedArticles.map(processStoredArticle);
      
      // Para não lidos, vamos assumir que há mais páginas se retornou o limite
      const hasMorePages = storedArticles.length === limit;
      setTotalPages(hasMorePages ? page + 1 : page);
      
      setArticles(processedArticles);
    } catch (err) {
      console.error('Erro ao carregar artigos não lidos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    loadUnreadArticles();
  }, [loadUnreadArticles]);

  return {
    articles,
    isLoading,
    totalPages,
    currentPage: page,
  };
};

// Hook para buscar artigos favoritos
export const useFavoriteFeed = (page: number = 1, limit: number = 20) => {
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);

  const loadFavoriteArticles = useCallback(() => {
    try {
      setIsLoading(true);
      const storedArticles = newsDatabase.getFavoriteArticles(page, limit);
      const processedArticles = storedArticles.map(processStoredArticle);
      
      const hasMorePages = storedArticles.length === limit;
      setTotalPages(hasMorePages ? page + 1 : page);
      
      setArticles(processedArticles);
    } catch (err) {
      console.error('Erro ao carregar artigos favoritos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    loadFavoriteArticles();
  }, [loadFavoriteArticles]);

  return {
    articles,
    isLoading,
    totalPages,
    currentPage: page,
  };
};

// Hook para paginação balanceada com métricas de diversidade
export const useBalancedFeed = (
  page: number = 1, 
  limit: number = 20, 
  options: {
    minFeeds?: number;
    maxPerFeed?: number;
    strategy?: 'balanced' | 'round-robin' | 'weighted';
  } = {}
) => {
  const { minFeeds = 3, maxPerFeed = Math.ceil(limit / 3), strategy = 'balanced' } = options;
  
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationStats, setPaginationStats] = useState<{
    totalArticles: number;
    totalPages: number;
    currentPage: number;
    articlesInPage: number;
    feedsInPage: number;
    diversityScore: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [diversityReport, setDiversityReport] = useState<{
    isValid: boolean;
    diversityScore: number;
    feedCount: number;
    issues: string[];
    recommendations: string[];
    metrics: unknown;
  } | null>(null);

  const loadBalancedArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar artigos com paginação inteligente
      const storedArticles = newsDatabase.getArticlesWithSmartPagination({
        page,
        limit,
        minFeeds,
        maxPerFeed,
        strategy
      });

      const processedArticles = storedArticles.map(processStoredArticle);
      
      // Obter estatísticas de paginação
      const stats = newsDatabase.getPaginationStats(page, limit, strategy);
      setPaginationStats(stats);
      
      // Obter relatório de diversidade se disponível
      try {
        const report = await syncService.getDiversityReport();
        setDiversityReport(report);
      } catch (err) {
        console.warn('Não foi possível obter relatório de diversidade:', err);
      }
      
      setArticles(processedArticles);
      
    } catch (err) {
      console.error('Erro ao carregar artigos balanceados:', err);
      setError('Erro ao carregar artigos balanceados');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, minFeeds, maxPerFeed, strategy]);

  const markAsRead = useCallback((articleId: string) => {
    newsDatabase.markAsRead(articleId);
    setArticles(prev => 
      prev.map(article => 
        article.id === articleId 
          ? { ...article, isRead: true }
          : article
      )
    );
  }, []);

  const toggleFavorite = useCallback((articleId: string) => {
    const newFavoriteStatus = newsDatabase.toggleFavorite(articleId);
    setArticles(prev => 
      prev.map(article => 
        article.id === articleId 
          ? { ...article, isFavorite: newFavoriteStatus }
          : article
      )
    );
  }, []);

  useEffect(() => {
    loadBalancedArticles();
  }, [loadBalancedArticles]);

  return {
    articles,
    isLoading,
    error,
    currentPage: page,
    paginationStats,
    diversityReport,
    markAsRead,
    toggleFavorite,
    refresh: loadBalancedArticles
  };
};

// Hook específico para monitoramento de saúde dos feeds
export const useFeedHealth = () => {
  const [feedHealthReport, setFeedHealthReport] = useState<{
    totalFeeds: number;
    activeFeeds: number;
    failedFeeds: unknown[];
    lastUpdate: number;
    articlesPerFeed: Record<string, number>;
    diversityScore: number;
    recommendations: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const refreshFeedHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const healthReport = await syncService.getFeedHealthReport();
      setFeedHealthReport(healthReport);
      setLastUpdate(Date.now());
      
    } catch (err) {
      console.error('Erro ao obter status de saúde dos feeds:', err);
      setError('Erro ao obter status de saúde dos feeds');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSpecificFeeds = useCallback(async (feedIds: string[]) => {
    try {
      const result = await syncService.refreshSpecificFeeds(feedIds);
      if (result.success) {
        await refreshFeedHealth();
      }
      return result;
    } catch (err) {
      console.error('Erro ao atualizar feeds específicos:', err);
      return { success: false, feedsRefreshed: 0, articlesFound: 0, errors: [] };
    }
  }, [refreshFeedHealth]);

  const getDiversityReport = useCallback(async () => {
    try {
      return await syncService.getDiversityReport();
    } catch (err) {
      console.error('Erro ao obter relatório de diversidade:', err);
      return null;
    }
  }, []);

  const getFeedDistributionAnalysis = useCallback(async () => {
    try {
      return await syncService.getFeedDistributionAnalysis();
    } catch (err) {
      console.error('Erro ao obter análise de distribuição:', err);
      return null;
    }
  }, []);

  const getDiversityTrendAnalysis = useCallback((days: number = 7) => {
    try {
      return syncService.getDiversityTrendAnalysis(days);
    } catch (err) {
      console.error('Erro ao obter análise de tendência:', err);
      return null;
    }
  }, []);

  const validateCurrentDiversity = useCallback(() => {
    try {
      return syncService.validateCurrentDiversity();
    } catch (err) {
      console.error('Erro ao validar diversidade atual:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshFeedHealth();
  }, [refreshFeedHealth]);

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFeedHealth();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshFeedHealth]);

  return {
    feedHealthReport,
    isLoading,
    error,
    lastUpdate,
    refreshFeedHealth,
    refreshSpecificFeeds,
    getDiversityReport,
    getFeedDistributionAnalysis,
    getDiversityTrendAnalysis,
    validateCurrentDiversity
  };
};

// Hook para métricas de diversidade em tempo real
export const useDiversityMetrics = () => {
  const [diversityReport, setDiversityReport] = useState<{
    isValid: boolean;
    diversityScore: number;
    feedCount: number;
    issues: string[];
    recommendations: string[];
    metrics: unknown;
  } | null>(null);
  const [distributionAnalysis, setDistributionAnalysis] = useState<unknown[] | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<{
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
    scoreChange: number;
    feedCountChange: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obter relatório de diversidade
      const report = await syncService.getDiversityReport();
      setDiversityReport(report);

      // Obter análise de distribuição
      const distribution = await syncService.getFeedDistributionAnalysis();
      setDistributionAnalysis(distribution);

      // Obter análise de tendência
      const trend = syncService.getDiversityTrendAnalysis(7);
      setTrendAnalysis(trend);

    } catch (err) {
      console.error('Erro ao obter métricas de diversidade:', err);
      setError('Erro ao obter métricas de diversidade');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateDiversity = useCallback(() => {
    try {
      return syncService.validateCurrentDiversity();
    } catch (err) {
      console.error('Erro ao validar diversidade:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return {
    diversityReport,
    distributionAnalysis,
    trendAnalysis,
    isLoading,
    error,
    refreshMetrics,
    validateDiversity
  };
};
