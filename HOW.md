# The Feeder - Documentação Técnica

## O que é o The Feeder?

O **The Feeder** é um agregador de feeds RSS/Atom/JSON Feed minimalista e robusto, desenvolvido para gerenciar e agregar conteúdo de múltiplas fontes em um único lugar. O sistema é multi-usuário, com autenticação JWT, busca full-text e recursos avançados de cache e rate limiting.

**Principais características:**
- Sistema multi-usuário com autenticação JWT
- Backend FastAPI assíncrono com Python
- Frontend React moderno com TypeScript
- Full-Text Search (FTS5) no SQLite
- Rate limiting inteligente por host
- Cache HTTP (ETag/Last-Modified) para eficiência
- Backoff adaptativo para feeds instáveis
- PWA com suporte offline
- Métricas Prometheus integradas

---

## Arquitetura do Sistema

### Stack Tecnológico

**Backend:**
- **FastAPI**: Framework web assíncrono de alta performance
- **SQLModel**: ORM moderno que combina SQLAlchemy e Pydantic
- **SQLite**: Banco de dados embarcado com FTS5 para busca
- **APScheduler**: Agendamento assíncrono de tarefas
- **httpx**: Cliente HTTP moderno com suporte HTTP/2
- **feedparser**: Parser universal de RSS/Atom/JSON Feed
- **python-jose**: Geração e validação de tokens JWT
- **passlib**: Hash de senhas com bcrypt

**Frontend:**
- **React 18**: Framework UI declarativo
- **TypeScript**: Tipagem estática
- **TanStack Query**: Gerenciamento de estado assíncrono
- **React Router**: Roteamento SPA
- **Tailwind CSS**: Estilização utility-first
- **Vite**: Build tool rápido para desenvolvimento

**Infraestrutura:**
- **Docker**: Containerização do backend
- **Docker Compose**: Orquestração de serviços
- **Nginx**: Proxy reverso para o frontend
- **SQLite WAL mode**: Modo write-ahead logging para concorrência

### Estrutura de Diretórios

```
thefeeder/
├── app/                          # Backend Python
│   ├── api/                      # Endpoints REST
│   ├── core/                     # Lógica de negócio
│   ├── web/                      # Servidor FastAPI
│   └── main.py                   # Entry point
├── frontend/                     # Frontend React
│   ├── src/
│   │   ├── app/                  # Páginas
│   │   ├── components/          # Componentes UI
│   │   ├── lib/                 # Utilitários
│   │   ├── contexts/            # Contextos React
│   │   └── types/               # TypeScript types
│   └── public/                   # Assets estáticos
├── tests/                        # Testes automatizados
└── feeds.yaml                    # Configuração de feeds
```

---

## Modelos de Dados

### Tabela: Feed

Representa um feed RSS/Atom configurado no sistema.

**Campos:**
- `id`: Identificador único (PK)
- `name`: Nome do feed
- `url`: URL do feed
- `interval_seconds`: Intervalo de atualização em segundos
- `enabled`: Se o feed está ativo
- `last_etag`: Último ETag receido (cache HTTP)
- `last_modified`: Última data de modificação (cache HTTP)
- `last_fetch_status`: Status da última busca (success/error/not_modified)
- `last_fetch_time`: Timestamp da última busca
- `is_fetching`: Lock para prevenir buscas concorrentes
- `consecutive_errors`: Contador de erros consecutivos
- `backoff_multiplier`: Multiplicador de backoff adaptativo
- `last_published_time`: Timestamp do último artigo publicado
- `degraded`: Se o feed está degradado (inativo)
- `tags`: Array JSON de tags
- `is_discoverable`: Se aparece em buscas públicas
- `creator_user_id`: ID do usuário criador (FK)

### Tabela: Item

Representa um artigo/item de um feed.

**Campos:**
- `id`: Identificador único (PK)
- `feed_id`: ID do feed (FK)
- `title`: Título do artigo
- `link`: URL do artigo
- `published`: Data de publicação
- `author`: Autor do artigo
- `summary`: Resumo/descrição
- `guid`: GUID para deduplicação
- `thumbnail`: URL da imagem thumbnail
- `is_new`: Se é novo (< 1 hora)
- `created_at`: Timestamp de criação

### Tabela: User

Representa um usuário do sistema.

**Campos:**
- `id`: Identificador único (PK)
- `email`: Email (único, indexado)
- `password_hash`: Hash bcrypt da senha
- `display_name`: Nome para exibição
- `handle`: Handle (@username, único, indexado)
- `avatar_url`: URL do avatar
- `bio`: Biografia
- `role`: Nível de acesso (user/moderator/admin)
- `is_active`: Se está ativo
- `timezone`: Timezone do usuário
- `default_sort`: Ordenação padrão
- `default_limit`: Limite de itens por página
- `created_at`: Timestamp de criação

### Tabela: Subscription

Relaciona usuários com feeds (inscrições).

**Campos:**
- `id`: Identificador único (PK)
- `user_id`: ID do usuário (FK)
- `feed_id`: ID do feed (FK)
- `is_public`: Se é pública no perfil
- `priority`: Prioridade para ordenação
- `mute_keywords`: Array JSON de palavras para filtrar
- `mute_domains`: Array JSON de domínios para filtrar
- `created_at`: Timestamp de criação

### Tabela: ReadState

Estado de leitura e favoritos de um usuário.

**Campos:**
- `id`: Identificador único (PK)
- `user_id`: ID do usuário (FK)
- `item_id`: ID do item (FK)
- `is_read`: Se foi lido
- `starred`: Se está favoritado
- `created_at`: Timestamp de criação

### Tabela: Collection

Coleção curatorial de artigos.

**Campos:**
- `id`: Identificador único (PK)
- `user_id`: ID do usuário (FK)
- `slug`: Slug identificador
- `title`: Título da coleção
- `description`: Descrição
- `is_public`: Se é pública
- `created_at`: Timestamp de criação
- `updated_at`: Timestamp de atualização

### Tabela: CollectionItem

Itens dentro de uma coleção.

**Campos:**
- `collection_id`: ID da coleção (PK/FK)
- `item_id`: ID do item (PK/FK)
- `position`: Posição na coleção
- `added_at`: Timestamp de adição

### Tabela: FetchLog

Log de operações de busca de feeds.

**Campos:**
- `id`: Identificador único (PK)
- `feed_id`: ID do feed (FK)
- `status_code`: Código HTTP de resposta
- `items_found`: Número de itens encontrados
- `items_new`: Número de itens novos
- `error_message`: Mensagem de erro (se houver)
- `duration_ms`: Duração em milissegundos
- `fetch_time`: Timestamp da busca

---

## Sistema de Fetching de Feeds

### APScheduler

O sistema utiliza o **APScheduler** para gerenciar buscas periódicas de feeds de forma assíncrona.

**Inicialização:**
1. Na startup da aplicação, o scheduler é iniciado
2. Os feeds são carregados do arquivo `feeds.yaml`
3. Para cada feed, um job é criado com intervalo customizado
4. Um jitter aleatório (±10%) é aplicado para evitar sincronização

**Execução de Jobs:**

Cada feed tem seu próprio job que executa o seguinte fluxo:

```python
1. Verifica lock (prevent concurrent fetches)
2. Faz requisição HTTP com cache headers (ETag/Last-Modified)
3. Parse do conteúdo com feedparser
4. Deduplicação por GUID
5. Salva novos itens no banco
6. Atualiza status e métricas
7. Libera lock
```

**Cache HTTP:**

O sistema utiliza cache HTTP para evitar downloads desnecessários:

- **ETag**: Hash de conteúdo para verificar mudanças
- **Last-Modified**: Data da última modificação
- **Status 304 Not Modified**: Retorna quando não há conteúdo novo

**Backoff Adaptativo:**

Feeds instáveis recebem tratamento especial:

- Contador de erros consecutivos
- Multiplicador de backoff (até 4x)
- Reseta automaticamente após sucesso

**Rate Limiting:**

- Token bucket por host (0.5 req/s por padrão)
- Semaphore global de concorrência (5 simultâneos por padrão)
- Respeita Retry-After headers
- Tracking de taxa de erro por host

### Manutenção Automática

**Jobs periódicos:**

1. **Maintenance (diário)**:
   - VACUUM e ANALYZE no banco
   - Limpeza de logs antigos
   - Otimização de índices

2. **Degradation Check (hourly)**:
   - Identifica feeds que não publicam há 24h
   - Marca feeds como degradados
   - Reduz frequência de busca

3. **Mark Old Items (contínuo)**:
   - Marca itens > 1h como não-novos
   - Atualiza badge de "new"

---

## Sistema de Autenticação

### JWT (JSON Web Tokens)

O sistema utiliza JWT para autenticação stateless.

**Tokens:**
- **Access Token**: Expira em 30 minutos
- **Refresh Token**: Expira em 30 dias

**Fluxo:**

```
1. Login → Valida credenciais
2. Gera access_token + refresh_token
3. Client armazena tokens no localStorage
4. Requests incluem Authorization: Bearer {token}
5. Server valida token e extrai user_id
6. Refresh de token quando expirar
```

**RBAC (Role-Based Access Control):**

- **admin**: Acesso total ao sistema
- **moderator**: Gestão de conteúdo
- **user**: Usuário padrão

**Hash de Senhas:**

- Algoritmo: bcrypt
- Salt automático
- Rounds configuráveis

### Endpoints de Autenticação

```
POST /api/auth/register  - Registrar novo usuário
POST /api/auth/login      - Login com email/password
POST /api/auth/refresh    - Refresh do access token
GET  /api/auth/me         - Dados do usuário atual
```

---

## APIs e Endpoints

### REST API

**Items:**
```
GET  /api/items                - Listar items (paginado)
GET  /api/items/{id}           - Obter item específico
```

**Feeds:**
```
GET  /api/feeds                - Listar todos os feeds
GET  /api/feeds/{id}           - Detalhes de um feed
GET  /api/feeds/{id}/items     - Items de um feed
```

**Auth:**
```
POST /api/auth/register        - Registrar
POST /api/auth/login           - Login
POST /api/auth/refresh         - Refresh token
GET  /api/auth/me              - Usuário atual
```

**Subscriptions:**
```
GET  /api/me/subscriptions      - Minhas inscrições
POST /api/me/subscriptions     - Adicionar inscrição
DELETE /api/me/subscriptions/{id} - Remover
```

**Collections:**
```
GET  /api/me/collections        - Minhas coleções
POST /api/me/collections        - Criar coleção
POST /api/me/collections/{slug}/items - Adicionar item
```

**Admin:**
```
GET  /admin/users               - Listar usuários
PATCH /admin/users/{id}         - Atualizar role
DELETE /admin/users/{id}        - Deletar usuário
GET  /admin/health              - Status do sistema
GET  /admin/refresh             - Forçar refresh
POST /admin/migrate            - Rodar migração
POST /admin/maintenance         - Manutenção manual
```

**Public:**
```
GET  /public/@{handle}         - Perfil público
GET  /public/@{handle}/feed.xml - Feed RSS público
GET  /public/@{handle}/theme.css - Theme CSS
GET  /public/@{handle}/collections/{slug} - Coleção pública
```

**Metrics:**
```
GET  /metrics                   - Prometheus metrics
GET  /health                    - Health check simples
```

### Query Parameters

**Busca e Filtragem:**
- `page`: Número da página (padrão: 1)
- `limit`: Items por página (padrão: 20, max: 100)
- `feed_id`: Filtrar por feed
- `search`: Query de busca (FTS5)
- `sort`: Ordenação (recent/oldest/title/feed)

**Exemplo:**
```
GET /api/items?page=2&limit=50&search=python&sort=recent
```

---

## Frontend React

### Estrutura

```
frontend/src/
├── app/                    # Páginas
│   ├── Home.tsx            # Feed principal (todos os itens)
│   ├── Explorar.tsx       # Exploração de feeds
│   ├── Feed.tsx            # Items de um feed específico
│   └── Item.tsx            # Detalhes de um item
├── components/             # Componentes reutilizáveis
│   ├── Layout.tsx          # Layout principal
│   ├── Header.tsx          # Cabeçalho
│   ├── Footer.tsx          # Rodapé
│   ├── EmptyState.tsx      # Estado vazio
│   ├── ItemSkeleton.tsx    # Skeleton loading
│   ├── Toast.tsx           # Notificações
│   └── ...                 # Outros componentes
├── lib/                    # Utilitários
│   ├── api.ts              # Cliente TanStack Query
│   ├── filters.ts          # Filtros de dados
│   ├── themes.ts           # Sistema de temas
│   └── ...                 # Outros utils
├── contexts/               # Contextos React
│   ├── PreferencesContext  # Preferências do usuário
│   └── CollectionsContext  # Coleções
└── hooks/                  # Custom hooks
    ├── useKeyboardShortcuts # Atalhos de teclado
    └── usePrefetch         # Prefetch de dados
```

### TanStack Query

O frontend utiliza **TanStack Query** para gerenciamento de estado assíncrono:

**Configuração:**
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
    },
  },
})
```

**Uso:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['items', page, search],
  queryFn: () => fetchItems({ page, search }),
})
```

### PWA (Progressive Web App)

**Service Worker:**
- Cache de assets estáticos
- Offline support
- Background sync

**Manifest:**
- Ícones e splash screens
- Theme color
- Display mode

**Instalável:**
- Pode ser instalado como app nativo
- Funciona offline
- Notificações push (futuro)

---

## Funcionalidades Avançadas

### Full-Text Search (FTS5)

O SQLite FTS5 fornece busca full-text ultra-rápida.

**Índice Virtual:**
```sql
CREATE VIRTUAL TABLE item_fts USING fts5(
  title, summary, author,
  content='item',
  content_rowid='id'
)
```

**Triggers:**
- `AFTER INSERT`: Adiciona ao FTS5
- `AFTER DELETE`: Remove do FTS5
- `AFTER UPDATE`: Atualiza no FTS5

**Busca:**
```python
# Busca por termo
fts_query = text("""
    SELECT rowid FROM item_fts 
    WHERE item_fts MATCH :search_term
""")
```

**Vantagens:**
- 10x mais rápido que LIKE
- Busca em múltiplos campos
- Ranking de relevância
- Suporte a queries complexas

### Rate Limiting Inteligente

**Token Bucket:**
- Bucket separado por host
- Taxa configurável (padrão: 0.5 req/s)
- Capacidade de tokens ajustável

**Global Concurrency:**
- Semaphore limitando requests simultâneos
- Padrão: 5 requests simultâneos
- Previne sobrecarga do sistema

**Retry-After:**
- Detecta header Retry-After
- Aplica delay automaticamente
- Evita bloqueios por rate limit

### Cache HTTP

**ETag / Last-Modified:**
- Cache baseado em headers HTTP
- Reduz bandwidth e latência
- Status 304 Not Modified quando sem mudanças

**Exemplo de fluxo:**
```
1ª request: GET → 200 OK + ETag: "abc123"
2ª request: GET + If-None-Match: "abc123" → 304 Not Modified
```

### Backoff Adaptativo

Feeds que falham repetidamente recebem tratamento especial:

```
Erros consecutivos → Multiplicador
1 erro             → 1.5x intervalo
2 erros            → 2.0x intervalo
3 erros            → 2.5x intervalo
4+ erros           → 4.0x intervalo (cap)
```

Sucesso reseta o multiplicador para 1.0x.

### Degradação de Feeds

Sistema de TTL (Time To Live) para identificar feeds inativos:

- Se um feed não publica há 24h → Marca como `degraded`
- Feed degradado reduz frequência de busca
- Visualmente diferenciado na UI (badge amarelo)
- Reseta automaticamente se publicar novamente

### Sistema de Temas

Usuários podem criar temas customizados:

```json
{
  "bg": "#ffffff",
  "fg": "#000000",
  "accent": "#0066cc",
  "border": "#cccccc"
}
```

**Temas built-in:**
- Light
- Dark
- Sepia
- Solarized
- High Contrast

**CSS Variables:**
```css
:root {
  --bg: var(--custom-bg, #ffffff);
  --fg: var(--custom-fg, #000000);
  --accent: var(--custom-accent, #0066cc);
}
```

### Métricas Prometheus

O sistema expõe métricas em formato Prometheus:

**Métricas disponíveis:**
- `feeder_fetch_total`: Total de fetches
- `feeder_fetch_duration_seconds`: Duração de fetches
- `feeder_items_new_total`: Items novos por feed
- `feeder_scheduler_queue_depth`: Jobs agendados
- `feeder_uptime_seconds`: Uptime do sistema
- `feeder_db_size_bytes`: Tamanho do banco
- `feeder_total_feeds`: Total de feeds
- `feeder_total_items`: Total de items

**Endpoint:**
```
GET /metrics
```

### WebSub (PubSubHubbub)

Suporte para updates em tempo real via WebSub:

**Callback:**
```
GET /websub/callback?hub.mode=subscribe&hub.topic=URL&hub.challenge=CHALLENGE
```

**Notification:**
```
POST /websub/callback (recebe updates push)
```

---

## Deployment

### Docker

**Backend (Dockerfile):**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app /app/app
COPY feeds.yaml /app/
CMD ["python", "app/main.py"]
```

**Frontend (Dockerfile):**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Docker Compose

**docker-compose.yml:**
```yaml
services:
  feeder:
    build: .
    env_file: .env
    volumes:
      - feeder_db:/data
    ports:
      - "7389:7389"
  
  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"
    depends_on:
      - feeder
```

### Variáveis de Ambiente

```bash
# App
APP_NAME="The Feeder"
APP_PORT=7389
APP_BASE_URL="https://feeder.example.com"

# User Agent
USER_AGENT_BASE="The Feeder/2025 (+https://feeder.example.com)"

# Network
PER_HOST_RPS=0.5
GLOBAL_CONCURRENCY=5
FETCH_TIMEOUT_SECONDS=20

# Retry
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_MS=800
RETRY_MAX_MS=10000

# Limits
MAX_FEEDS=150
MAX_ITEMS=1500

# Timezone
TIMEZONE="America/Sao_Paulo"

# Database
DB_PATH="/data/feeder.sqlite"

# JWT
JWT_SECRET_KEY="your-secret-key-change-in-production"
```

### feeds.yaml

Configuração de feeds:

```yaml
- name: "Hacker News"
  url: "https://hnrss.org/frontpage"
  interval_seconds: 600

- name: "Python Blog"
  url: "https://www.python.org/jobs/feed/rss/"
  interval_seconds: 1200

- name: "Reddit - r/programming"
  url: "https://www.reddit.com/r/programming/.rss"
  interval_seconds: 1800
```

---

## Fluxo de Dados Completo

### 1. Inicialização

```
1. app/main.py → Inicia servidor Uvicorn
2. FastAPI startup → Inicializa scheduler
3. Scheduler → Carrega feeds de feeds.yaml
4. Para cada feed → Cria job assíncrono
5. Jobs imediatos → Fetch inicial de todos feeds
```

### 2. Busca de Feed

```
1. Job scheduler dispara → feed_id
2. Adquire lock (is_fetching = true)
3. Busca cache headers (ETag/Last-Modified)
4. Faz request HTTP com cache
5. Se 304 → Libera lock e retorna
6. Se 200 → Parse com feedparser
7. Deduplicação por GUID
8. Salva novos items
9. Atualiza status e métricas
10. Libera lock
11. Agenda próximo fetch
```

### 3. API Request

```
1. Client → GET /api/items?page=1&search=python
2. Server → Middleware security headers
3. FastAPI → Roteamento para handler
4. Storage → Query com FTS5
5. Serialize → Timezone conversion
6. Response → JSON paginado
7. Client → TanStack Query cache
8. UI → Renderização React
```

### 4. Autenticação

```
1. Client → POST /api/auth/login
2. Server → Valida email/password
3. Bcrypt → Verifica hash
4. JWT → Gera access + refresh tokens
5. Response → Tokens para client
6. Client → Armazena no localStorage
7. Próximos requests → Authorization header
8. Middleware → Valida token
9. Decorator → Extrai user
10. Endpoint → Access user data
```

---

## Segurança

### Security Headers

```python
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; ...
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

### CORS

```python
allow_origins=[
    "http://localhost:5173",      # Vite dev
    "http://localhost:3000",       # Alternative dev
    "https://feeder.example.com", # Production
]
allow_credentials=True
allow_methods=["GET", "POST", "OPTIONS"]
```

### Validação

- Input sanitization
- SQL injection prevention (ORM parameterized)
- XSS protection (HTML cleaning)
- CSRF tokens (FastAPI built-in)

---

## Performance

### Otimizações

1. **SQLite WAL mode**: Concorrência otimizada
2. **FTS5**: Busca full-text em tempo real
3. **Cache HTTP**: Reduz bandwidth
4. **Pagination**: Limite de 100 items por página
5. **Lazy loading**: Imagens carregadas sob demanda
6. **Rate limiting**: Previne sobrecarga
7. **Connection pooling**: httpx AsyncClient
8. **Async/await**: Não bloqueia I/O

### Limites

- Max feeds: 150
- Max items: 1500 (auto-cleanup)
- Items por página: 10-100
- Timeout de fetch: 20s
- Concorrência global: 5
- Rate limit: 0.5 req/s por host

---

## Monitoramento

### Health Check

```
GET /health
→ {"status": "healthy", "app_name": "The Feeder", "version": "0.5.0"}
```

### Admin Status

```
GET /admin/health
→ Página HTML com status detalhado
  - Scheduler status
  - Database stats
  - Feed health
  - Uptime
```

### Métricas Prometheus

```
GET /metrics
→ # HELP feeder_fetch_total Total fetches
  # TYPE feeder_fetch_total counter
  feeder_fetch_total{feed_id="1"} 234
  feeder_fetch_duration_seconds{feed_id="1"} 2.5
```

---

## Desenvolvimento

### Setup Local

```bash
# Backend
pip install -r requirements.txt
cp .env.example .env
python -m app.main

# Frontend
cd frontend
npm install
npm run dev
```

### Testes

```bash
# Run tests
pytest

# With coverage
pytest --cov=app tests/
```

### Linting

```bash
# Backend
ruff check app/

# Frontend
cd frontend && npm run lint
```

---

## Conclusão

O **The Feeder** é um sistema robusto e completo para agregação de feeds RSS/Atom. Com arquitetura moderna, escalável e de fácil manutenção, oferece aos usuários uma experiência rica para consumir conteúdo de múltiplas fontes.

**Principais conquistas:**
- Performance otimizada com SQLite FTS5
- Rate limiting inteligente
- Cache HTTP eficiente
- Sistema multi-usuário com JWT
- Frontend moderno PWA-ready
- Prometheus metrics integrado
- Deployment simplificado com Docker

**Tecnologias modernas:**
- Python async (FastAPI)
- React + TypeScript
- SQLite com WAL mode
- Docker containerization
- TanStack Query
- Prometheus observability

---

## Troubleshooting

### Problema: Feeds não atualizam há mais de 1 dia

**Diagnóstico:**
```bash
# Ver status de todos os feeds
curl http://localhost:7389/admin/feeds-status | jq

# Ver diagnóstico de um feed específico
curl http://localhost:7389/admin/feeds/{feed_id}/diagnostics | jq
```

**Possíveis causas e soluções:**

#### 1. Feeds marcados como degradados
Feeds que não publicam há 24h são marcados como `degraded`.
- **Verificar**: `hours_since_fetch` > 24
- **Solução**: Sistema detecta automaticamente quando há nova publicação

#### 2. Erros de parsing XML
Feeds com XML malformado não são processados.
- **Sintoma**: Logs mostram "not well-formed (invalid token)"
- **Solução**: Sistema tenta múltiplos encodings automaticamente

#### 3. Cache HTTP muito agressivo
ETag/Last-Modified pode estar bloqueando updates legítimos.
- **Verificar**: Status 304 em todas as requests
- **Solução**: Force refresh com bypass de cache
```bash
curl -X POST "http://localhost:7389/admin/feeds/{feed_id}/force-refresh?bypass_cache=true"
```

#### 4. Backoff adaptativo ativo
Feeds com muitos erros têm intervalo aumentado.
- **Verificar**: `backoff_multiplier` > 1.0
- **Solução**: Aguardar ou forçar reset manual

### Endpoints de Diagnóstico

```
GET  /admin/feeds-status       - Status de todos os feeds
GET  /admin/feeds/{id}/diagnostics  - Diagnóstico detalhado
POST /admin/feeds/{id}/force-refresh - Forçar refresh com bypass cache
```

### Logs Úteis

**Parser com erro mas tentando continuar:**
```
Feed X has parsing errors but proceeding: <error>
```

**Cache HTTP funcionando:**
```
Feed X: No new content (304 Not Modified). 
Last fetch was at YYYY-MM-DD. Using ETag: abc123...
```

**Feed sem items encontrados:**
```
Feed X: No items found. Content size: Y bytes, Status: 200
```

---

**Desenvolvido por Pablo Murad**  
**MIT License - 2025**

