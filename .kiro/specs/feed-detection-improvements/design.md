# Design Document

## Overview

Este documento descreve o design técnico para melhorar o sistema de descoberta e validação de feeds do TheFeeder. A solução envolve refatorar a função `discoverFeeds()` para priorizar validação direta de URLs de feed, usar o rss-parser para validação robusta, e implementar estratégia de fallback em múltiplos níveis.

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Feed Discovery Flow (Current)                           │
│                                                          │
│  1. Normalize URL                                       │
│  2. Check special cases (Reddit, YouTube, GitHub)       │
│  3. Fetch HTML and parse for feed links                 │
│  4. Try common feed paths                               │
│  5. Validate each found URL with HEAD/GET               │
│                                                          │
│  Problem: Direct feed URLs are treated as HTML pages    │
└─────────────────────────────────────────────────────────┘
```

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Feed Discovery Flow (New)                               │
│                                                          │
│  1. Normalize URL                                       │
│  2. Try Direct Feed Validation (NEW)                    │
│     └─> Use rss-parser to validate                     │
│     └─> If valid, return immediately                   │
│  3. Check special cases (Reddit, YouTube, GitHub)       │
│  4. Fetch HTML and parse for feed links                 │
│  5. Try common feed paths                               │
│  6. Validate all found URLs with rss-parser             │
│                                                          │
│  Improvement: Direct feeds detected first               │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Direct Feed Validator (`validateFeedDirect`)

**Responsabilidade**: Validar se uma URL é um feed válido usando rss-parser

```typescript
interface FeedValidationResult {
  isValid: boolean;
  feedInfo?: {
    title: string;
    description?: string;
    itemCount: number;
    lastItemDate?: Date;
    type: "rss" | "atom" | "json";
  };
  error?: string;
}

async function validateFeedDirect(url: string): Promise<FeedValidationResult>
```

**Implementation**:
- Usa rss-parser para fazer parse do feed
- Não depende apenas do Content-Type header
- Extrai metadados do feed (título, descrição, contagem)
- Detecta automaticamente o tipo de feed
- Timeout de 10 segundos

### 2. Enhanced Feed Discovery (`discoverFeeds`)

**Responsabilidade**: Orquestrar a descoberta de feeds com estratégia de fallback

```typescript
async function discoverFeeds(siteUrl: string): Promise<DiscoveredFeed[]>
```

**Flow**:
1. **Level 1**: Validação direta da URL fornecida
2. **Level 2**: Descoberta via HTML (se Level 1 falhar)
3. **Level 3**: Tentativa de caminhos comuns (se Level 2 não encontrar)

### 3. Feed Parser Integration

**Responsabilidade**: Usar rss-parser para validação robusta

```typescript
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  customFields: {
    feed: ["subtitle", "updated"],
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});
```

### 4. Caching Layer

**Responsabilidade**: Cachear resultados de validação para evitar requisições duplicadas

```typescript
interface CacheEntry {
  result: FeedValidationResult;
  timestamp: number;
}

const validationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### 5. Parallel Validation

**Responsabilidade**: Validar múltiplas URLs em paralelo

```typescript
async function validateMultipleFeeds(urls: string[]): Promise<FeedValidationResult[]> {
  return Promise.all(urls.map(url => validateFeedDirect(url)));
}
```

## Data Models

Não há mudanças nos modelos de dados do Prisma. Continuamos usando:
- `Feed` - Para armazenar feeds descobertos
- `Item` - Para armazenar items dos feeds

### Enhanced DiscoveredFeed Interface

```typescript
export interface DiscoveredFeed {
  url: string;
  title: string;
  type: "rss" | "atom" | "json";
  description?: string;
  itemCount?: number;
  lastItemDate?: Date;
  discoveryMethod: "direct" | "html" | "common-path" | "special";
}
```

## Error Handling

### Network Errors

```typescript
try {
  const feed = await parser.parseURL(url);
  return { isValid: true, feedInfo: extractFeedInfo(feed) };
} catch (error) {
  if (error.code === "ETIMEDOUT") {
    return { isValid: false, error: "Feed validation timeout" };
  }
  if (error.code === "ENOTFOUND") {
    return { isValid: false, error: "Feed URL not found" };
  }
  return { isValid: false, error: "Invalid feed format" };
}
```

### Parse Errors

```typescript
try {
  const feed = await parser.parseURL(url);
  if (!feed.items || feed.items.length === 0) {
    console.warn(`Feed ${url} has no items`);
  }
  return { isValid: true, feedInfo: extractFeedInfo(feed) };
} catch (error) {
  console.error(`Failed to parse feed ${url}:`, error.message);
  return { isValid: false, error: `Parse error: ${error.message}` };
}
```

### Content-Type Mismatch

```typescript
// Log warning but don't fail if content is valid feed
const contentType = response.headers.get("content-type");
if (contentType && !contentType.includes("xml") && !contentType.includes("json")) {
  console.warn(`Feed ${url} has unexpected Content-Type: ${contentType}`);
}
// Continue with parse attempt
```

## Testing Strategy

### Unit Tests

1. **Direct Validation**
   - Test with valid RSS feed URL
   - Test with valid Atom feed URL
   - Test with valid JSON feed URL
   - Test with invalid URL
   - Test with HTML page URL

2. **Feed Info Extraction**
   - Test title extraction
   - Test description extraction
   - Test item count
   - Test last item date

3. **Caching**
   - Test cache hit
   - Test cache miss
   - Test cache expiration

### Integration Tests

1. **Real Feed URLs**
   - Test with https://myduckisdead.org/feed/
   - Test with various WordPress feeds
   - Test with Atom feeds
   - Test with JSON feeds

2. **Fallback Strategy**
   - Test direct validation success
   - Test fallback to HTML discovery
   - Test fallback to common paths

### Manual Testing

1. **Feed Discovery UI**
   - Test with direct feed URLs
   - Test with homepage URLs
   - Test with invalid URLs
   - Test with slow-loading feeds

## Performance Considerations

### Timeout Strategy

- Direct validation: 10 seconds
- HTML fetch: 10 seconds
- Common path validation: 5 seconds each
- Total max time: ~30 seconds for complete discovery

### Bandwidth Optimization

- Use HEAD request first when possible
- Limit feed download to 1MB
- Cache validation results for 5 minutes
- Parallel validation of multiple URLs

### Memory Management

- Clear cache entries older than 5 minutes
- Limit cache size to 100 entries
- Use WeakMap for temporary caching

## Security Considerations

### URL Validation

```typescript
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}
```

### SSRF Prevention

- Only allow http:// and https:// protocols
- Reject localhost and private IP ranges
- Set reasonable timeouts
- Limit response size

### XSS Prevention

- Escape all feed metadata before displaying
- Sanitize feed titles and descriptions
- Validate URLs before storing

## Documentation Requirements

### Code Comments

```typescript
/**
 * Validate if a URL points to a valid RSS/Atom/JSON feed
 * Uses rss-parser to validate feed structure
 * 
 * @param url - URL to validate
 * @returns Validation result with feed info if valid
 * 
 * @example
 * const result = await validateFeedDirect('https://example.com/feed');
 * if (result.isValid) {
 *   console.log(`Found feed: ${result.feedInfo.title}`);
 * }
 */
```

### User-Facing Messages

- "Feed detected successfully"
- "No feeds found. Try entering the direct feed URL (e.g., /feed or /rss)"
- "Feed validation timeout. Please try again"
- "Invalid feed format. Please check the URL"

## Migration Strategy

### Phase 1: Add Direct Validation
1. Implement `validateFeedDirect()` function
2. Add to beginning of `discoverFeeds()` flow
3. Test with known feed URLs

### Phase 2: Enhance Validation
1. Replace HEAD/GET validation with rss-parser
2. Add feed metadata extraction
3. Update DiscoveredFeed interface

### Phase 3: Add Caching
1. Implement validation cache
2. Add cache cleanup logic
3. Monitor cache hit rate

### Phase 4: Optimize Performance
1. Add parallel validation
2. Optimize timeout values
3. Add progress indicators in UI

## Design Rationale

### Why rss-parser for Validation?

- More reliable than Content-Type checking
- Validates actual feed structure
- Extracts metadata in one pass
- Handles multiple feed formats
- Better error messages

### Why Direct Validation First?

- Users often provide direct feed URLs
- Faster than HTML parsing
- Reduces unnecessary HTTP requests
- Better user experience

### Why 3-Level Fallback?

- Maximizes feed discovery success rate
- Handles different site configurations
- Provides multiple chances to find feeds
- Graceful degradation

### Why Cache Validation Results?

- Reduces redundant HTTP requests
- Improves performance
- Reduces server load
- Better user experience on retries
