# Plano de Melhorias - TheFeeder

## Fase 1: Melhorias Críticas de Performance e Segurança

### 1.1 Rate Limiting Distribuído com Redis

- Substituir `apps/web/src/lib/rate-limit.ts` (Map em memória) por implementação com Redis
- Instalar `ioredis` e criar `apps/web/src/lib/redis.ts` para conexão compartilhada
- Criar `apps/web/src/lib/rate-limit-redis.ts` com funções de rate limiting baseadas em Redis
- Atualizar `apps/web/app/api/subscribers/route.ts` para usar novo rate limiting
- Adicionar rate limiting em outros endpoints críticos (`POST /api/feeds`, `POST /api/feeds/discover`)

### 1.2 Otimização de Verificação de Duplicatas

- Criar migration para adicionar campo `normalizedUrl` no modelo Feed (`apps/web/prisma/schema.prisma`)
- Adicionar índice único em `normalizedUrl`
- Criar função helper para normalizar URL ao criar/atualizar feed
- Modificar `apps/web/app/api/feeds/route.ts` para usar `findUnique` com `normalizedUrl` ao invés de buscar todos os feeds
- Atualizar `apps/web/app/api/feeds/[id]/route.ts` para normalizar URL na atualização

### 1.3 Otimização de Queries - Cleanup de Itens

- Modificar `apps/worker/src/jobs/feed-fetch.ts` função `cleanupOldItems()` para usar `deleteMany` com subquery ao invés de `findMany` + loop
- Criar migration para adicionar índices em `Item.publishedAt` e `Item.createdAt`
- Considerar mover cleanup para job separado se necessário

### 1.4 Adicionar Índices no Banco de Dados

- Criar migration para índices adicionais:
- `Feed.url` (já unique, mas garantir índice)
- `Item.publishedAt` (para ordenação e cleanup)
- `Item.createdAt` (para fallback de ordenação)
- `Item.feedId` + `Item.publishedAt` (composite, para queries por feed)

## Fase 2: Validação e Segurança

### 2.1 Validação com Zod

- Instalar `zod` em `apps/web/package.json`
- Criar schemas de validação em `apps/web/src/lib/validations/`:
- `feed.schema.ts` (validação de criação/atualização de feed)
- `subscriber.schema.ts` (validação de subscriber)
- `opml.schema.ts` (validação de OPML import)
- Criar middleware de validação `apps/web/src/lib/validation-middleware.ts`
- Atualizar rotas de API para usar validação Zod:
- `apps/web/app/api/feeds/route.ts`
- `apps/web/app/api/feeds/[id]/route.ts`
- `apps/web/app/api/subscribers/route.ts`
- `apps/web/app/api/feeds/import/opml/route.ts`

### 2.2 Sanitização de HTML

- Instalar `dompurify` e `isomorphic-dompurify` para sanitização server-side
- Criar `apps/web/src/lib/sanitize.ts` com funções de sanitização
- Aplicar sanitização em `summary` e `content` ao salvar items
- Atualizar `apps/web/src/lib/rss-parser.ts` e `apps/worker/src/lib/rss-parser.ts` para sanitizar conteúdo

### 2.3 Headers de Segurança

- Criar `apps/web/src/lib/security-headers.ts` com configuração de headers
- Atualizar `apps/web/next.config.mjs` para adicionar headers de segurança:
- HSTS (Strict-Transport-Security)
- CSP (Content-Security-Policy)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Adicionar middleware em `apps/web/middleware.ts` se necessário

### 2.4 TypeScript Mais Rigoroso

- Verificar e remover todos os `any` explícitos
- Criar tipos específicos para erros em `apps/web/src/types/errors.ts`
- Atualizar handlers de erro para usar tipos específicos
- Verificar `apps/web/tsconfig.json` (já tem `strict: true`, garantir compliance)

## Fase 3: Logging Estruturado

### 3.1 Configurar Pino Logger

- Instalar `pino` e `pino-pretty` (dev) em `apps/web/package.json` e `apps/worker/package.json`
- Criar `apps/web/src/lib/logger.ts` com configuração do logger
- Criar `apps/worker/src/lib/logger.ts` com configuração do logger
- Configurar diferentes níveis de log (info, warn, error, debug)
- Adicionar contexto (request ID, user ID) quando disponível

### 3.2 Substituir console.log/error

- Substituir todos os `console.log` e `console.error` por logger estruturado:
- `apps/web/app/api/**/*.ts`
- `apps/web/src/lib/**/*.ts`
- `apps/worker/src/**/*.ts`
- Manter `console.log` apenas para desenvolvimento local se necessário

### 3.3 Adicionar Request ID Middleware

- Criar middleware em `apps/web/middleware.ts` ou criar novo arquivo para adicionar request ID
- Usar request ID em logs para rastreabilidade

## Fase 4: Sistema de Notificações e UX

### 4.1 Sistema de Toast

- Instalar `react-hot-toast` em `apps/web/package.json`
- Criar provider `apps/web/src/components/ToastProvider.tsx`
- Adicionar provider em `apps/web/app/layout.tsx`
- Criar hook `apps/web/src/hooks/useToast.ts` para facilitar uso

### 4.2 Substituir alert() por Toast

- Atualizar `apps/web/src/components/FeedsManager.tsx`:
- Substituir todos os `alert()` por toast notifications
- Adicionar loading states com toast
- Melhorar mensagens de erro/sucesso
- Atualizar outros componentes que usam `alert()` ou feedback inline

### 4.3 Melhorar Tratamento de Erros

- Criar tipos de erro específicos em `apps/web/src/types/errors.ts`
- Criar função helper `apps/web/src/lib/error-handler.ts` para normalizar erros
- Retornar mensagens de erro mais específicas das APIs
- Exibir erros de forma amigável no frontend

## Fase 5: Acessibilidade

### 5.1 ARIA Labels e Semântica

- Adicionar ARIA labels em componentes principais:
- `apps/web/src/components/FeedsManager.tsx`
- `apps/web/src/components/FeedCard.tsx`
- `apps/web/src/components/FeedList.tsx`
- `apps/web/src/components/SubscribeForm.tsx`
- Melhorar estrutura semântica HTML (usar `<nav>`, `<main>`, `<section>`, etc.)

### 5.2 Navegação por Teclado

- Adicionar suporte completo a navegação por teclado
- Adicionar focus styles visíveis
- Implementar skip links para navegação rápida

### 5.3 Contraste e Cores

- Verificar contraste de cores no tema atual
- Garantir WCAG AA compliance mínimo
- Adicionar melhorias de contraste se necessário

## Fase 6: Cache e Performance

### 6.1 Cache de Feed Discovery

- Criar `apps/web/src/lib/cache.ts` com funções de cache usando Redis
- Implementar cache para resultados de `POST /api/feeds/discover` (TTL: 1 hora)
- Cache de parsing de feeds (TTL: 30 minutos)

### 6.2 Cache de Estatísticas

- Cachear resultados de `getStats()` em `apps/web/src/lib/server-data.ts`
- Invalidar cache quando feeds/itens são criados/deletados
- TTL de 5 minutos para estatísticas

### 6.3 Otimização de Queries com Cache

- Adicionar cache em queries frequentes
- Usar Redis para cache distribuído

## Fase 7: Background Jobs Resilientes

### 7.1 Retry com Backoff Exponencial

- Configurar retry em `apps/worker/src/index.ts` para workers BullMQ
- Adicionar configuração de backoff exponencial
- Limitar número máximo de tentativas

### 7.2 Dead Letter Queue

- Configurar DLQ para jobs que falham repetidamente
- Adicionar monitoramento de DLQ
- Criar endpoint/admin para visualizar jobs falhos

### 7.3 Monitoramento de Feeds

- Criar modelo `FeedError` em `apps/web/prisma/schema.prisma` para rastrear erros
- Registrar erros de fetch em `apps/worker/src/jobs/feed-fetch.ts`
- Criar alerta/admin para feeds que falham repetidamente (> 3 falhas consecutivas)

## Fase 8: Documentação

### 8.1 Atualizar CONTRIBUTING.md

- Remover referências ao Python
- Atualizar para refletir stack Node.js/TypeScript/Next.js
- Adicionar instruções para rodar testes (quando implementados)
- Atualizar comandos de desenvolvimento

### 8.2 Atualizar README.md

- Adicionar seção sobre novas features (rate limiting, validação, etc.)
- Documentar variáveis de ambiente adicionais
- Adicionar seção de troubleshooting

## Fase 9: Responsividade e PWA

### 9.1 Melhorias Mobile-First

- Revisar e melhorar breakpoints em componentes
- Garantir touch targets adequados (mínimo 44x44px)
- Otimizar performance em dispositivos móveis

### 9.2 PWA Completo

- Verificar `apps/web/public/manifest.json`
- Adicionar service worker se necessário
- Garantir funcionamento offline básico

## Arquivos Principais a Modificar

- `apps/web/src/lib/rate-limit.ts` → Substituir por implementação Redis
- `apps/web/app/api/feeds/route.ts` → Validação Zod, otimização duplicatas
- `apps/web/prisma/schema.prisma` → Adicionar campos e índices
- `apps/worker/src/jobs/feed-fetch.ts` → Otimizar cleanup, logging estruturado
- `apps/web/src/components/FeedsManager.tsx` → Toast, acessibilidade
- `CONTRIBUTING.md` → Atualizar para Node.js/TypeScript
- Criar novos arquivos: logger, validações, cache, sanitização






