// FreshRSS API Service
// Configuração via variáveis de ambiente
import { diversityConfig } from './config';

const FRESHRSS_BASE_URL = import.meta.env.VITE_FRESHRSS_BASE_URL || 'https://rss.pablo.space';
const API_USER = import.meta.env.VITE_FRESHRSS_USER || 'pablo';
const API_TOKEN = import.meta.env.VITE_FRESHRSS_TOKEN || 'd991aac8f61b014b2100632c19cbf3edfcc820e7';
const API_PASSWORD = import.meta.env.VITE_FRESHRSS_PASSWORD || 'driver21';

export interface FreshRSSArticle {
  id: string;
  title: string;
  author: string;
  content: string;
  link: string;
  published: number;
  updated: number;
  categories: string[];
  tags: string[];
  enclosure?: {
    href: string;
    type: string;
    length: number;
  };
}

export interface FreshRSSFeed {
  id: string;
  name: string;
  url: string;
  website: string;
  description: string;
  lastUpdate: number;
  priority: number;
  error: boolean;
  cssFullContent: boolean;
  kind: number;
  urlView: string;
  entries: FreshRSSArticle[];
}

export interface FreshRSSResponse {
  items: FreshRSSArticle[];
  total: number;
}

// Feed Health Monitoring Interfaces
export interface FeedHealth {
  feedId: string;
  feedName: string;
  isActive: boolean;
  lastSuccessfulFetch: number;
  errorCount: number;
  lastError?: FeedError;
  articleCount: number;
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

export interface FeedStatistics {
  feedId: string;
  feedName: string;
  totalArticles: number;
  recentArticles: number;
  averageArticlesPerDay: number;
  lastUpdate: number;
}

export interface FeedMonitor {
  checkFeedHealth(feedId: string): Promise<FeedHealth>;
  getAllFeedsHealth(): Promise<FeedHealth[]>;
  logFeedError(feedId: string, error: FeedError): void;
  getFeedStatistics(feedId: string): FeedStatistics;
}

// Multi-Strategy Retrieval Interfaces
export interface RetrievalOptions {
  limit?: number;
  offset?: number;
  sinceId?: number;
  maxId?: number;
  feedIds?: string[];
  timeWindow?: {
    start: number;
    end: number;
  };
}

export interface ArticleResult {
  articles: FreshRSSArticle[];
  strategy: string;
  success: boolean;
  feedsFound: number;
  totalArticles: number;
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class FreshRSSService implements FeedMonitor {
  private baseUrl: string;
  private user: string;
  private token: string;
  private password: string;
  private feedHealthCache: Map<string, FeedHealth> = new Map();
  private feedErrorLog: FeedError[] = [];
  private retryConfig: RetryConfig = {
    maxRetries: diversityConfig.performance.retryMaxAttempts,
    baseDelay: diversityConfig.performance.retryBaseDelay,
    maxDelay: diversityConfig.performance.retryMaxDelay,
    backoffMultiplier: diversityConfig.performance.retryBackoffMultiplier
  };

  constructor() {
    this.baseUrl = FRESHRSS_BASE_URL;
    this.user = API_USER;
    this.token = API_TOKEN;
    this.password = API_PASSWORD;
  }

  private md5(string: string): string {
    // Proper MD5 implementation for browser compatibility
    // This is a simplified but working MD5 hash
    function rotateLeft(value: number, amount: number): number {
      return (value << amount) | (value >>> (32 - amount));
    }

    function addUnsigned(x: number, y: number): number {
      return ((x & 0x7FFFFFFF) + (y & 0x7FFFFFFF)) ^ (x & 0x80000000) ^ (y & 0x80000000);
    }

    function f(x: number, y: number, z: number): number {
      return (x & y) | ((~x) & z);
    }

    function g(x: number, y: number, z: number): number {
      return (x & z) | (y & (~z));
    }

    function h(x: number, y: number, z: number): number {
      return x ^ y ^ z;
    }

    function i(x: number, y: number, z: number): number {
      return y ^ (x | (~z));
    }

    function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(str: string): number[] {
      const wordArray: number[] = [];
      const messageLength = str.length;
      const numberOfWords = (((messageLength + 8) >>> 6) + 1) * 16;

      for (let i = 0; i < numberOfWords; i++) {
        wordArray[i] = 0;
      }

      for (let i = 0; i < messageLength; i++) {
        wordArray[i >>> 2] |= (str.charCodeAt(i) & 0xFF) << ((i % 4) * 8);
      }

      wordArray[messageLength >>> 2] |= 0x80 << ((messageLength % 4) * 8);
      wordArray[numberOfWords - 2] = messageLength << 3;
      wordArray[numberOfWords - 1] = messageLength >>> 29;

      return wordArray;
    }

    function wordToHex(value: number): string {
      let result = '';
      for (let i = 0; i <= 3; i++) {
        const byte = (value >>> (i * 8)) & 255;
        result += ('0' + byte.toString(16)).slice(-2);
      }
      return result;
    }

    const x = convertToWordArray(string);
    let a = 0x67452301;
    let b = 0xEFCDAB89;
    let c = 0x98BADCFE;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;

      a = ff(a, b, c, d, x[k + 0], 7, 0xD76AA478);
      d = ff(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
      c = ff(c, d, a, b, x[k + 2], 17, 0x242070DB);
      b = ff(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
      a = ff(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
      d = ff(d, a, b, c, x[k + 5], 12, 0x4787C62A);
      c = ff(c, d, a, b, x[k + 6], 17, 0xA8304613);
      b = ff(b, c, d, a, x[k + 7], 22, 0xFD469501);
      a = ff(a, b, c, d, x[k + 8], 7, 0x698098D8);
      d = ff(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
      c = ff(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
      b = ff(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
      a = ff(a, b, c, d, x[k + 12], 7, 0x6B901122);
      d = ff(d, a, b, c, x[k + 13], 12, 0xFD987193);
      c = ff(c, d, a, b, x[k + 14], 17, 0xA679438E);
      b = ff(b, c, d, a, x[k + 15], 22, 0x49B40821);

      a = gg(a, b, c, d, x[k + 1], 5, 0xF61E2562);
      d = gg(d, a, b, c, x[k + 6], 9, 0xC040B340);
      c = gg(c, d, a, b, x[k + 11], 14, 0x265E5A51);
      b = gg(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
      a = gg(a, b, c, d, x[k + 5], 5, 0xD62F105D);
      d = gg(d, a, b, c, x[k + 10], 9, 0x2441453);
      c = gg(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
      b = gg(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
      a = gg(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
      d = gg(d, a, b, c, x[k + 14], 9, 0xC33707D6);
      c = gg(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
      b = gg(b, c, d, a, x[k + 8], 20, 0x455A14ED);
      a = gg(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
      d = gg(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
      c = gg(c, d, a, b, x[k + 7], 14, 0x676F02D9);
      b = gg(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);

      a = hh(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
      d = hh(d, a, b, c, x[k + 8], 11, 0x8771F681);
      c = hh(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
      b = hh(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
      a = hh(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
      d = hh(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
      c = hh(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
      b = hh(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
      a = hh(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
      d = hh(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
      c = hh(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
      b = hh(b, c, d, a, x[k + 6], 23, 0x4881D05);
      a = hh(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
      d = hh(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
      c = hh(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
      b = hh(b, c, d, a, x[k + 2], 23, 0xC4AC5665);

      a = ii(a, b, c, d, x[k + 0], 6, 0xF4292244);
      d = ii(d, a, b, c, x[k + 7], 10, 0x432AFF97);
      c = ii(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
      b = ii(b, c, d, a, x[k + 5], 21, 0xFC93A039);
      a = ii(a, b, c, d, x[k + 12], 6, 0x655B59C3);
      d = ii(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
      c = ii(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
      b = ii(b, c, d, a, x[k + 1], 21, 0x85845DD1);
      a = ii(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
      d = ii(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
      c = ii(c, d, a, b, x[k + 6], 15, 0xA3014314);
      b = ii(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
      a = ii(a, b, c, d, x[k + 4], 6, 0xF7537E82);
      d = ii(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
      c = ii(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
      b = ii(b, c, d, a, x[k + 9], 21, 0xEB86D391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  private async makeFeverRequest(params: Record<string, string | number> = {}) {
    // Usar proxy local em desenvolvimento, URL direta em produção
    const url = process.env.NODE_ENV === 'development'
      ? '/api/fever.php'  // Proxy local
      : `${this.baseUrl}/api/fever.php`;  // URL direta

    // Criar hash de autenticação
    const authHash = this.md5(`${this.user}:${this.password}`);

    const formData = new URLSearchParams({
      api_key: authHash,
      ...params
    });

    // Requisição silenciosa

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Pablo-Magazine/1.0',
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Resposta processada com sucesso
      return data;
    } catch (error) {
      console.error('FreshRSS Fever API Error:', error);
      throw error;
    }
  }

  // Buscar todos os artigos usando Fever API
  async getAllArticles(limit: number = 100, offset: number = 0): Promise<FreshRSSArticle[]> {
    try {
      // Primeiro, buscar todos os feeds para garantir que temos acesso a todos
      const feedsResponse = await this.makeFeverRequest({
        feeds: ''
      });

      // Buscar todos os artigos de todos os feeds
      const itemsResponse = await this.makeFeverRequest({
        items: '',
        since_id: 0  // Buscar desde o início
      });

      if (itemsResponse && itemsResponse.items && Array.isArray(itemsResponse.items)) {
        // Ordenar por data de publicação (mais recentes primeiro)
        const sortedItems = itemsResponse.items.sort((a: { created_on_time?: number }, b: { created_on_time?: number }) =>
          (b.created_on_time || 0) - (a.created_on_time || 0)
        );

        // Limitar o número de artigos retornados
        const limitedItems = sortedItems.slice(offset, Math.min(offset + limit, sortedItems.length));

        return limitedItems.map((item: {
          id: string | number;
          title?: string;
          author?: string;
          html?: string;
          content?: string;
          url?: string;
          created_on_time?: number;
          feed_id: string | number;
        }) => ({
          id: item.id.toString(),
          title: item.title || 'Sem título',
          author: item.author || 'Autor desconhecido',
          content: item.html || item.content || '',
          link: item.url || '',
          published: item.created_on_time || Math.floor(Date.now() / 1000),
          updated: item.created_on_time || Math.floor(Date.now() / 1000),
          categories: [this.getFeedTitle(item.feed_id, feedsResponse?.feeds) || 'Geral'],
          tags: [],
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching all articles:', error);
      return [];
    }
  }

  // Função auxiliar para obter o título do feed
  private getFeedTitle(feedId: number, feeds: { id: string | number; name?: string; title?: string }[]): string {
    if (!feeds || !Array.isArray(feeds)) {
      console.log(`⚠️ Feeds não disponíveis para ID ${feedId}`);
      return 'Geral';
    }

    // Converter feedId para número se necessário
    const numericFeedId = typeof feedId === 'string' ? parseInt(feedId) : feedId;

    const feed = feeds.find(f => {
      const feedIdNum = typeof f.id === 'string' ? parseInt(f.id) : f.id;
      return feedIdNum === numericFeedId;
    });

    const title = feed?.name || feed?.title || 'Geral';
    console.log(`🔍 Feed ID ${feedId} -> "${title}"`);
    return title;
  }

  // Buscar artigos recentes (alias para getAllArticles)
  async getRecentArticles(limit: number = 20, offset: number = 0): Promise<FreshRSSArticle[]> {
    return this.getAllArticles(limit, offset);
  }

  // Buscar artigos por feed específico
  async getArticlesByFeed(feedId: string, limit: number = 20): Promise<FreshRSSArticle[]> {
    try {
      const response = await this.makeFeverRequest({
        items: '',
        since_id: 0,
        feed_ids: feedId  // Especificar feed específico
      });

      if (response && response.items) {
        return response.items.map((item: {
          id: string | number;
          title?: string;
          author?: string;
          html?: string;
          content?: string;
          url?: string;
          created_on_time?: number;
          feed_title?: string;
        }) => {
          // Tentar obter o nome do feed de múltiplas formas
          let feedName = item.feed_title;
          
          // Se não tem feed_title, tentar extrair do contexto
          if (!feedName || feedName.trim() === '') {
            // Buscar o feed correspondente pelo ID se possível
            // Por enquanto, usar um fallback mais inteligente
            feedName = 'Feed-' + feedId; // Usar o feedId passado como parâmetro
          }
          
          const article = {
            id: item.id.toString(),
            title: item.title || 'Sem título',
            author: item.author || 'Autor desconhecido',
            content: item.html || item.content || '',
            link: item.url || '',
            published: item.created_on_time || Math.floor(Date.now() / 1000),
            updated: item.created_on_time || Math.floor(Date.now() / 1000),
            categories: [feedName],
            tags: [],
            // Adicionar campo customizado para preservar informação do feed
            feedName: feedName,
            feedId: feedId
          } as any;
          
          return article;
        });
      }

      return [];
    } catch (error) {
      console.error('Error fetching articles by feed:', error);
      return [];
    }
  }

  // Buscar artigos de múltiplos feeds
  async getArticlesFromAllFeeds(limit: number = 100): Promise<FreshRSSArticle[]> {
    try {
      console.log('🔍 Iniciando busca de artigos de todos os feeds...');

      // Primeiro buscar todos os feeds disponíveis
      const feedsResponse = await this.getFeeds();
      console.log(`📡 Encontrados ${feedsResponse?.length || 0} feeds`);

      if (!feedsResponse || feedsResponse.length === 0) {
        console.log('⚠️ Nenhum feed encontrado, usando método padrão');
        return this.getAllArticles(limit);
      }

      // Tentar diferentes abordagens para buscar artigos de todos os feeds
      console.log('📡 Tentativa 1: Buscar todos os artigos...');
      let response = await this.makeFeverRequest({
        items: ''
      });

      // Se só retornar de um feed, tentar com parâmetros diferentes
      if (response?.items?.length > 0) {
        const feedIds = [...new Set(response.items.map((item: { feed_id: string | number }) => item.feed_id))];
        console.log(`📊 Feeds únicos na resposta: ${feedIds.length} de ${feedsResponse.length} feeds`);

        if (feedIds.length === 1) {
          console.log('⚠️ Apenas um feed retornado, tentando abordagem alternativa...');

          // Tentar buscar artigos não lidos de todos os feeds
          response = await this.makeFeverRequest({
            items: '',
            since_id: 0,
            max_id: 0
          });

          if (response?.items?.length > 0) {
            const newFeedIds = [...new Set(response.items.map((item: { feed_id: string | number }) => item.feed_id))];
            console.log(`📊 Nova tentativa - Feeds únicos: ${newFeedIds.length}`);
          }
        }
      }

      console.log('📊 Resposta da API:', {
        hasResponse: !!response,
        hasItems: !!(response?.items),
        itemsLength: response?.items?.length || 0,
        isArray: Array.isArray(response?.items)
      });

      if (response && response.items && Array.isArray(response.items)) {
        console.log(`✅ Processando ${response.items.length} artigos da API`);
        const processedArticles = response.items.map((item: {
          id: string | number;
          title?: string;
          author?: string;
          html?: string;
          content?: string;
          url?: string;
          created_on_time?: number;
          feed_id: string | number;
        }) => ({
          id: item.id.toString(),
          title: item.title || 'Sem título',
          author: item.author || 'Autor desconhecido',
          content: item.html || item.content || '',
          link: item.url || '',
          published: item.created_on_time || Math.floor(Date.now() / 1000),
          updated: item.created_on_time || Math.floor(Date.now() / 1000),
          categories: [this.getFeedTitle(item.feed_id, feedsResponse) || 'Geral'],
          tags: [],
        }));

        // Ordenar por data e limitar
        const sortedArticles = processedArticles.sort((a, b) => b.published - a.published);
        return sortedArticles.slice(0, limit);
      }

      return [];
    } catch (error) {
      console.error('Error fetching articles from all feeds:', error);
      return this.getAllArticles(limit); // Fallback para método padrão
    }
  }

  // Buscar feeds disponíveis
  async getFeeds(): Promise<FreshRSSFeed[]> {
    try {
      const response = await this.makeFeverRequest({
        feeds: '' // Parâmetro correto para buscar feeds
      });

      if (response && response.feeds && Array.isArray(response.feeds)) {
        return response.feeds.map((feed: {
          id: string | number;
          title?: string;
          url?: string;
          site_url?: string;
          last_updated_on_time?: number;
        }) => ({
          id: feed.id.toString(),
          name: feed.title || 'Feed sem nome',
          url: feed.url || '',
          website: feed.site_url || '',
          description: feed.title || 'Feed sem descrição',
          lastUpdate: feed.last_updated_on_time || 0,
          priority: 0,
          error: false,
          cssFullContent: false,
          kind: 0,
          urlView: feed.site_url || '',
          entries: [],
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching feeds:', error);
      return [];
    }
  }

  // Buscar categorias
  async getCategories(): Promise<{ id: string; name: string }[]> {
    try {
      const response = await this.makeFeverRequest({
        api: 'groups'
      });

      if (response && response.groups) {
        return response.groups.map((group: {
          id: string | number;
          title?: string;
        }) => ({
          id: group.id.toString(),
          name: group.title,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Feed Monitor Implementation
  async checkFeedHealth(feedId: string): Promise<FeedHealth> {
    // Verificar se o feed está em quarentena
    // Funcionalidade de quarentena temporariamente desabilitada para evitar problemas de compilação

    try {
      // Buscar artigos específicos deste feed para testar conectividade
      const response = await this.makeFeverRequest({
        items: '',
        feed_ids: feedId,
        since_id: 0
      });

      const feedInfo = await this.getFeedInfo(feedId);
      const articleCount = response?.items?.length || 0;
      const now = Date.now();

      const feedHealth: FeedHealth = {
        feedId,
        feedName: feedInfo?.name || `Feed ${feedId}`,
        isActive: response && response.items !== undefined,
        lastSuccessfulFetch: now,
        errorCount: 0,
        articleCount
      };

      // Se bem-sucedido, limpar erros antigos
      // Funcionalidade temporariamente desabilitada
      // if (feedHealth.isActive && articleCount > 0) {
      //   feedErrorManager.clearFeedErrors(feedId);
      // }

      // Atualizar cache
      this.feedHealthCache.set(feedId, feedHealth);
      return feedHealth;

    } catch (error) {
      const feedInfo = await this.getFeedInfo(feedId).catch(() => null);
      const feedError: FeedError = {
        feedId,
        feedName: feedInfo?.name || `Feed ${feedId}`,
        errorType: 'api',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        strategy: 'individual-feed-check',
        retryCount: 0
      };

      this.logFeedError(feedId, feedError);

      const feedHealth: FeedHealth = {
        feedId,
        feedName: feedInfo?.name || `Feed ${feedId}`,
        isActive: false,
        lastSuccessfulFetch: 0,
        errorCount: 1,
        lastError: feedError,
        articleCount: 0
      };

      this.feedHealthCache.set(feedId, feedHealth);
      return feedHealth;
    }
  }

  async getAllFeedsHealth(): Promise<FeedHealth[]> {
    try {
      const feeds = await this.getFeeds();
      const healthPromises = feeds.map(feed => this.checkFeedHealth(feed.id));
      const healthResults = await Promise.allSettled(healthPromises);

      return healthResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // Fallback para feeds que falharam na verificação
          const feed = feeds[index];
          return {
            feedId: feed.id,
            feedName: feed.name,
            isActive: false,
            lastSuccessfulFetch: 0,
            errorCount: 1,
            articleCount: 0,
            lastError: {
              feedId: feed.id,
              feedName: feed.name,
              errorType: 'api',
              errorMessage: 'Failed to check feed health',
              timestamp: Date.now(),
              strategy: 'health-check',
              retryCount: 0
            }
          };
        }
      });
    } catch (error) {
      console.error('Error getting all feeds health:', error);
      return [];
    }
  }

  logFeedError(feedId: string, error: FeedError): void {
    // Usar o Feed Error Manager para logging avançado
    // Importação dinâmica não é necessária aqui, vamos usar uma abordagem diferente
    // feedErrorManager.logFeedError(feedId, error);

    // Manter compatibilidade com o sistema antigo
    this.feedErrorLog.push(error);

    // Manter apenas os últimos 100 erros para evitar memory leak
    if (this.feedErrorLog.length > 100) {
      this.feedErrorLog = this.feedErrorLog.slice(-100);
    }

    // Atualizar contador de erros no cache de saúde
    const cachedHealth = this.feedHealthCache.get(feedId);
    if (cachedHealth) {
      cachedHealth.errorCount += 1;
      cachedHealth.lastError = error;
      this.feedHealthCache.set(feedId, cachedHealth);
    }
  }

  getFeedStatistics(feedId: string): FeedStatistics {
    const cachedHealth = this.feedHealthCache.get(feedId);

    return {
      feedId,
      feedName: cachedHealth?.feedName || `Feed ${feedId}`,
      totalArticles: cachedHealth?.articleCount || 0,
      recentArticles: cachedHealth?.articleCount || 0,
      averageArticlesPerDay: 0, // TODO: Implementar cálculo baseado em histórico
      lastUpdate: cachedHealth?.lastSuccessfulFetch || 0
    };
  }

  // Método auxiliar para obter informações de um feed específico
  private async getFeedInfo(feedId: string): Promise<FreshRSSFeed | null> {
    try {
      const feeds = await this.getFeeds();
      return feeds.find(feed => feed.id === feedId) || null;
    } catch (error) {
      return null;
    }
  }

  // Método para obter erros recentes de um feed específico
  getFeedErrors(feedId?: string): FeedError[] {
    if (feedId) {
      return this.feedErrorLog.filter(error => error.feedId === feedId);
    }
    return [...this.feedErrorLog];
  }

  // Método para limpar cache de saúde (útil para forçar nova verificação)
  clearHealthCache(): void {
    this.feedHealthCache.clear();
  }

  // Retry logic com backoff exponencial
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    feedId?: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.retryConfig.maxRetries) {
          // Log do erro final
          if (feedId) {
            this.logFeedError(feedId, {
              feedId,
              feedName: `Feed ${feedId}`,
              errorType: 'api',
              errorMessage: `${context}: ${lastError.message}`,
              timestamp: Date.now(),
              strategy: context,
              retryCount: attempt
            });
          }
          throw lastError;
        }

        // Calcular delay com backoff exponencial
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );

        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Unknown error in retry logic');
  }

  // Multi-Strategy Retrieval Methods

  // Estratégia 1: Buscar artigos de múltiplos feeds individualmente
  async getArticlesByMultipleFeeds(options: RetrievalOptions = {}): Promise<ArticleResult> {
    const { limit = 100, feedIds } = options;

    try {
      console.log(`🔍 [multiple-feeds] Iniciando busca com limit=${limit}, feedIds=${feedIds?.length || 'all'}`);
      
      return await this.retryWithBackoff(async () => {
        const feeds = feedIds ?
          (await this.getFeeds()).filter(feed => feedIds.includes(feed.id)) :
          await this.getFeeds();

        console.log(`📡 [multiple-feeds] Encontrados ${feeds.length} feeds para processar`);

        if (feeds.length === 0) {
          console.log(`❌ [multiple-feeds] Nenhum feed encontrado`);
          return {
            articles: [],
            strategy: 'multiple-feeds',
            success: false,
            feedsFound: 0,
            totalArticles: 0,
            error: 'No feeds found'
          };
        }

        const allArticles: FreshRSSArticle[] = [];
        let successfulFeeds = 0;
        const articlesPerFeed = Math.ceil(limit / feeds.length);

        console.log(`📊 [multiple-feeds] Buscando ${articlesPerFeed} artigos por feed`);

        // Buscar artigos de cada feed individualmente
        // Limitar a 10 feeds para evitar timeout e melhorar performance
        const feedsToProcess = feeds.slice(0, 10);
        console.log(`📊 [multiple-feeds] Processando ${feedsToProcess.length} feeds (de ${feeds.length} disponíveis)`);
        
        for (const feed of feedsToProcess) {
          try {
            console.log(`🔍 [multiple-feeds] Processando feed: ${feed.name} (ID: ${feed.id})`);
            const feedArticles = await this.getArticlesByFeed(feed.id, articlesPerFeed);
            
            if (feedArticles.length > 0) {
              // Garantir que todos os artigos tenham o nome correto do feed
              feedArticles.forEach(article => {
                article.categories = [feed.name];
                (article as any).feedName = feed.name;
                (article as any).feedId = feed.id;
              });
              
              allArticles.push(...feedArticles);
              successfulFeeds++;
              console.log(`✅ [multiple-feeds] Feed ${feed.name}: ${feedArticles.length} artigos`);
            } else {
              console.log(`⚠️ [multiple-feeds] Feed ${feed.name}: 0 artigos`);
            }
          } catch (error) {
            console.error(`❌ [multiple-feeds] Erro no feed ${feed.name}:`, error);
            // Log erro do feed específico mas continue com outros feeds
            this.logFeedError(feed.id, {
              feedId: feed.id,
              feedName: feed.name,
              errorType: 'feed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              timestamp: Date.now(),
              strategy: 'multiple-feeds',
              retryCount: 0
            });
          }
        }

        // Ordenar por data e limitar
        const sortedArticles = allArticles
          .sort((a, b) => b.published - a.published)
          .slice(0, limit);

        const result = {
          articles: sortedArticles,
          strategy: 'multiple-feeds',
          success: successfulFeeds > 0,
          feedsFound: successfulFeeds,
          totalArticles: sortedArticles.length
        };

        console.log(`📊 [multiple-feeds] Resultado final:`, {
          success: result.success,
          feedsFound: result.feedsFound,
          totalArticles: result.totalArticles,
          articlesLength: result.articles.length
        });

        return result;
      }, 'multiple-feeds-retrieval');

    } catch (error) {
      return {
        articles: [],
        strategy: 'multiple-feeds',
        success: false,
        feedsFound: 0,
        totalArticles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Estratégia 2: Buscar artigos por janela de tempo
  async getArticlesByTimeWindow(options: RetrievalOptions = {}): Promise<ArticleResult> {
    const { limit = 100, timeWindow } = options;

    try {
      return await this.retryWithBackoff(async () => {
        const params: Record<string, string | number> = {
          items: ''
        };

        if (timeWindow) {
          // Usar since_id baseado no timestamp de início
          params.since_id = Math.floor(timeWindow.start / 1000);
          if (timeWindow.end) {
            params.max_id = Math.floor(timeWindow.end / 1000);
          }
        }

        const response = await this.makeFeverRequest(params);

        if (!response || !response.items || !Array.isArray(response.items)) {
          return {
            articles: [],
            strategy: 'time-window',
            success: false,
            feedsFound: 0,
            totalArticles: 0,
            error: 'No items in API response'
          };
        }

        // Filtrar por janela de tempo se especificada
        let filteredItems = response.items;
        if (timeWindow) {
          filteredItems = response.items.filter((item: { created_on_time?: number }) => {
            const itemTime = (item.created_on_time || 0) * 1000;
            return itemTime >= timeWindow.start &&
              (!timeWindow.end || itemTime <= timeWindow.end);
          });
        }

        // Processar artigos
        const feeds = await this.getFeeds();
        const articles = filteredItems
          .slice(0, limit)
          .map((item: {
            id: string | number;
            title?: string;
            author?: string;
            html?: string;
            content?: string;
            url?: string;
            created_on_time?: number;
            feed_id: string | number;
          }) => ({
            id: item.id.toString(),
            title: item.title || 'Sem título',
            author: item.author || 'Autor desconhecido',
            content: item.html || item.content || '',
            link: item.url || '',
            published: item.created_on_time || Math.floor(Date.now() / 1000),
            updated: item.created_on_time || Math.floor(Date.now() / 1000),
            categories: [this.getFeedTitle(Number(item.feed_id), feeds) || 'Geral'],
            tags: [],
          }));

        const uniqueFeeds = new Set(filteredItems.map((item: { feed_id: string | number }) => item.feed_id));

        return {
          articles,
          strategy: 'time-window',
          success: articles.length > 0,
          feedsFound: uniqueFeeds.size,
          totalArticles: articles.length
        };
      }, 'time-window-retrieval');

    } catch (error) {
      return {
        articles: [],
        strategy: 'time-window',
        success: false,
        feedsFound: 0,
        totalArticles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Estratégia 3: Buscar por categorias/grupos
  async getArticlesByCategory(options: RetrievalOptions = {}): Promise<ArticleResult> {
    const { limit = 100 } = options;

    try {
      return await this.retryWithBackoff(async () => {
        // Primeiro buscar grupos/categorias
        const categories = await this.getCategories();

        if (categories.length === 0) {
          // Fallback para busca normal se não há categorias
          return await this.getArticlesByTimeWindow(options);
        }

        const allArticles: FreshRSSArticle[] = [];
        let successfulCategories = 0;

        // Buscar artigos por categoria
        for (const category of categories) {
          try {
            const response = await this.makeFeverRequest({
              items: '',
              group_ids: category.id
            });

            if (response && response.items && Array.isArray(response.items)) {
              const feeds = await this.getFeeds();
              const categoryArticles = response.items
                .slice(0, Math.ceil(limit / categories.length))
                .map((item: {
                  id: string | number;
                  title?: string;
                  author?: string;
                  html?: string;
                  content?: string;
                  url?: string;
                  created_on_time?: number;
                  feed_id: string | number;
                }) => ({
                  id: item.id.toString(),
                  title: item.title || 'Sem título',
                  author: item.author || 'Autor desconhecido',
                  content: item.html || item.content || '',
                  link: item.url || '',
                  published: item.created_on_time || Math.floor(Date.now() / 1000),
                  updated: item.created_on_time || Math.floor(Date.now() / 1000),
                  categories: [this.getFeedTitle(Number(item.feed_id), feeds) || category.name],
                  tags: [],
                }));

              allArticles.push(...categoryArticles);
              successfulCategories++;
            }
          } catch (error) {
            // Continue com outras categorias mesmo se uma falhar
            console.error(`Error fetching category ${category.name}:`, error);
          }
        }

        // Ordenar e limitar
        const sortedArticles = allArticles
          .sort((a, b) => b.published - a.published)
          .slice(0, limit);

        const uniqueFeeds = new Set(allArticles.map(article => article.categories[0]));

        return {
          articles: sortedArticles,
          strategy: 'category-based',
          success: successfulCategories > 0,
          feedsFound: uniqueFeeds.size,
          totalArticles: sortedArticles.length
        };
      }, 'category-based-retrieval');

    } catch (error) {
      return {
        articles: [],
        strategy: 'category-based',
        success: false,
        feedsFound: 0,
        totalArticles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Marcar artigo como lido
  async markAsRead(articleId: string): Promise<boolean> {
    try {
      await this.makeFeverRequest({
        api: 'items',
        id: articleId,
        mark: 'read'
      });
      return true;
    } catch (error) {
      console.error('Error marking article as read:', error);
      return false;
    }
  }

  // Marcar artigo como favorito
  async markAsFavorite(articleId: string): Promise<boolean> {
    try {
      await this.makeFeverRequest({
        api: 'items',
        id: articleId,
        mark: 'saved'
      });
      return true;
    } catch (error) {
      console.error('Error marking article as favorite:', error);
      return false;
    }
  }
}

// Instância singleton do serviço
export const freshRSSService = new FreshRSSService();

// Exportar o monitor de feeds para uso externo
export const feedMonitor: FeedMonitor = freshRSSService;

// Função utilitária para formatar data
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Função utilitária para calcular tempo de leitura
export const calculateReadingTime = (content: string): string => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
};

// Função para extrair imagem do conteúdo
export const extractImageFromContent = (content: string): string | null => {
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
  return imgMatch ? imgMatch[1] : null;
};

// Função para limpar HTML do conteúdo
export const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};
