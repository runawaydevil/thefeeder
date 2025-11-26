# Changelog - TheFeeder v2.0.0

## 🎉 Versão 2.0.0 - Major Update

### ✨ Novas Funcionalidades

#### Busca e Filtros
- **Busca de artigos**: Busque por título, conteúdo, resumo ou autor
- **Filtros avançados**: Filtre por feed, data de publicação, ordenação
- **Página de busca**: Nova página `/search` com interface completa
- **API de busca**: `GET /api/items/search?q=query`
- **API com filtros**: `GET /api/items?feedId=...&startDate=...&endDate=...&sortBy=...&sortOrder=...`

#### Export de Dados
- **Export de favoritos**: Exporte artigos favoritos em CSV ou JSON
- **Filtro por likes**: Configure mínimo de likes para export
- **API de export**: `GET /api/items/export?format=csv&minLikes=1`

#### UX/UI Melhorado
- **Sistema de Toast**: Notificações toast para feedback do usuário
- **Loading Spinner**: Componente reutilizável para estados de carregamento
- **Tratamento de erros**: Mensagens de erro mais amigáveis
- **Feedback visual**: Melhor feedback em operações longas

### 🔒 Melhorias de Segurança

#### Rate Limiting Granular
- Rate limiting distribuído usando Redis
- Limites específicos por endpoint:
  - Items API: 30 req/min
  - Search API: 20 req/min
  - Vote API: 5 req/min
  - Feed Create: 10 req/min
  - Feed Discover: 10 req/min
  - Subscribers: 5 req/min
  - Export: 10 req/hora

#### Validação de Payloads
- Validação de tamanho de payloads (max 1MB)
- Validação de URLs
- Validação de emails
- Validação de strings (max 10KB)
- Sanitização de inputs

#### CORS Configurável
- CORS configurável via `ALLOWED_ORIGINS` env var
- Headers CORS em todas as respostas API
- Suporte a preflight requests

### ⚡ Melhorias de Performance

#### Redis Otimizado
- Conexão explícita na inicialização
- Health check do Redis
- Tratamento de erros melhorado
- Fallback graceful quando Redis não disponível

### 📊 Monitoramento

#### Health Checks Melhorados
- **Web**: `/api/health` com métricas completas
- **Worker**: `/health` com métricas de jobs
- Status de banco de dados e Redis
- Métricas de feeds, items, subscribers
- Status de jobs no worker

#### Logging Estruturado
- Logger estruturado com níveis (DEBUG, INFO, WARN, ERROR)
- Configurável via `LOG_LEVEL` env var
- Formato consistente: `[timestamp] [LEVEL] message {context}`

### 🔧 Melhorias Técnicas

#### Versões Unificadas
- Prisma atualizado: 5.19.1 → 6.19.0 (worker)
- Versão do projeto: 2.0.0 (padronizada)
- Schema sincronizado entre web e worker

#### Código
- Componentes reutilizáveis criados
- Hooks customizados (`useToast`)
- Utilitários de validação e segurança
- Melhor organização de código

## 📝 Breaking Changes

Nenhum breaking change. Todas as mudanças são retrocompatíveis.

## 🔄 Migração

### Atualizar Dependências

```bash
# Root
npm install

# Web
cd apps/web
npm install

# Worker
cd apps/worker
npm install
npx prisma generate
```

### Variáveis de Ambiente Novas

```env
# Logging
LOG_LEVEL=info  # debug, info, warn, error

# CORS (opcional)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Testar Health Checks

```bash
# Web
curl http://localhost:7389/api/health

# Worker
curl http://localhost:7388/health
```

## 🐛 Correções

- ✅ Cache Redis agora conecta explicitamente
- ✅ Versões de Prisma sincronizadas
- ✅ Rate limiting mais robusto
- ✅ Validação de payloads implementada
- ✅ CORS configurado corretamente

## 📚 Documentação

- `MELHORIAS_PLANO.md` - Plano completo de melhorias
- `MELHORIAS_PROGRESSO.md` - Progresso detalhado
- `MELHORIAS_RESUMO_FINAL.md` - Resumo final
- `EMAIL_SPAM_FIXES.md` - Correções de email

## 🙏 Agradecimentos

Todas as melhorias foram implementadas seguindo as melhores práticas de desenvolvimento.

