<div align="center">

# Pablo Feeds - Minimalist RSS Aggregator

![Logo](app/assets/logo.png)

A minimalist, conservative RSS feed aggregator built with Python FastAPI and Jinja2 templates.

</div>

### Version: 1.0.0 - Multi-User Edition

**Author:** Pablo Murad <pablomurad@pm.me>  
**Repositories:** [GitHub](https://github.com/runawaydevil/thefeeder) • [Forgejo](https://git.teu.cool/pablo/thefeeder)

---


## Features

### Core Features
- **Multi-User System**: JWT authentication with role-based access control (RBAC)
- **User Management**: Admin, Moderator, and User roles
- **Minimalist Design**: Clean, responsive React frontend with Tailwind CSS
- **Dark/Light Theme**: Automatic theme detection with manual toggle
- **Custom Themes**: JSON-based theme system with CSS variables
- **RSS/Atom Support**: Parses feeds with feedparser (supports RSS, Atom, JSON Feed)
- **Smart Fetching**: ETag/Last-Modified caching, rate limiting, retry with backoff
- **Per-Feed Intervals**: Custom update intervals per feed
- **Feed Limit**: Maximum 150 feeds supported
- **Item Limit**: Maximum 1500 articles stored (older items auto-deleted)
- **Deduplication**: Prevents duplicate articles
- **Timezone Support**: Display timestamps in any IANA timezone
- **Docker Ready**: Complete containerization setup

### Multi-User Features (v1.0.0)
- **🔐 JWT Authentication**: Secure login with access + refresh tokens
- **👥 User Profiles**: Customizable profiles with @handle URLs
- **🎨 Custom Themes**: JSON-based theming system per user
- **📝 Collections**: Curated lists of articles (collections)
- **🔔 Subscriptions**: User-specific feed subscriptions
- **📊 Public Profiles**: Shareable user profiles with public feeds
- **⚙️ Admin Panel**: RBAC-based administration interface
- **🔒 Feed Privacy**: Public/private subscription controls

### User Experience (v1.0.0)
- **🔍 FTS5 Search**: Ultra-fast full-text search (10x faster than LIKE)
- **📑 Smart Pagination**: Configurable pagination (10-100 items per page)
- **⏰ Relative Time**: "2 hours ago" with timezone support
- **✅ Read Tracking**: Mark articles as read with visual indicators
- **🔄 Custom Sorting**: Sort by recent, oldest, title, or feed
- **🎨 Status Indicators**: Feed health badges with color-coded status
- **🖼️ Image Handling**: Smart placeholders and lazy loading with proxy
- **♿ Accessibility**: WCAG AA compliant with skip links and ARIA support
- **📱 Empty States**: Contextual messages with helpful actions
- **📋 List View**: Toggle between Cards and compact List view
- **⌨️ Keyboard Shortcuts**: j/k navigation, o/Enter open, m mark read
- **🎨 Multiple Themes**: Light, Dark, Sepia, Solarized, High Contrast
- **📱 PWA Support**: Service Worker, offline support, manifest

### Advanced Features
- **🔒 Feed Locking**: Prevents concurrent fetches of same feed
- **📈 Adaptive Backoff**: Automatically reduces frequency for unstable feeds
- **⚡ HEAD Requests**: Cache checks without downloading content
- **🔍 Autodiscovery**: Automatically find RSS feeds from websites
- **📦 OPML Support**: Import/export feeds in standard format
- **🔔 WebSub**: Real-time updates via PubSubHubbub
- **⏱️ TTL Tracking**: Automatic degradation of inactive feeds
- **📊 Prometheus Metrics**: Full observability with /metrics endpoint
- **🔧 Auto Maintenance**: VACUUM, ANALYZE, and log cleanup
- **🛡️ Enhanced Security**: CSP, COEP, CORP headers

## Quick Start

1. **Clone and configure**:
   ```bash
   cp .env.example .env
   # Edit .env with your feeds and settings
   ```

2. **Run with Docker**:
   ```bash
   docker compose up --build
   ```

3. **Access**: http://localhost:7389
   - Frontend React (main interface)
   - API REST at `/api/*`
   - Admin endpoints at `/admin/*`

## Configuration

### Environment Variables

- `APP_NAME`: Application name (displayed in header)
- `USER_AGENT_BASE`: User-Agent string (Reddit-compliant)
- `FEEDS_YAML`: YAML string with feed configurations
- `PER_HOST_RPS`: Requests per second per host (default: 0.5)
- `DEFAULT_FETCH_INTERVAL_SECONDS`: Default update interval (default: 600)
- `MAX_FEEDS`: Maximum number of feeds (default: 1500)
- `TIMEZONE`: Timezone for displaying article timestamps (default: UTC)

### Feed Configuration

Feeds are configured in the `FEEDS_YAML` environment variable:

```yaml
- name: "Feed Name"
  url: "https://example.com/feed.xml"
  interval_seconds: 1200
```

### Timezone Configuration

Set the `TIMEZONE` environment variable to display article timestamps in your local timezone:

```bash
# Examples
TIMEZONE=America/Sao_Paulo    # Brazil (UTC-3)
TIMEZONE=America/New_York     # US East (UTC-5/-4)
TIMEZONE=Europe/London        # UK (UTC+0/+1)
TIMEZONE=Asia/Tokyo           # Japan (UTC+9)
```

The system uses IANA timezone names. If an invalid timezone is provided, it falls back to UTC.

## API Endpoints

### Authentication API
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: Login with email/password
- `POST /api/auth/refresh`: Refresh access token
- `GET /api/auth/me`: Get current user info

### User API
- `GET /api/me/subscriptions`: Get user's subscriptions
- `POST /api/me/subscriptions`: Add subscription
- `DELETE /api/me/subscriptions/{id}`: Remove subscription
- `GET /api/me/collections`: Get user's collections
- `POST /api/me/collections`: Create collection
- `POST /api/me/collections/{slug}/items`: Add item to collection

### Public API
- `GET /public/@{handle}`: Public user profile
- `GET /public/@{handle}/feed.xml`: Public RSS feed
- `GET /public/@{handle}/theme.css`: Custom theme CSS
- `GET /public/@{handle}/collections/{slug}`: Public collection

### REST API (for React frontend)
- `GET /api/items`: Get paginated items with filtering
- `GET /api/items/{id}`: Get single item details
- `GET /api/feeds`: List all feeds
- `GET /api/feeds/{id}`: Get feed details with stats
- `GET /api/feeds/{id}/items`: Get items for specific feed

### Admin API (RBAC)
- `GET /admin/users`: List all users (admin only)
- `PATCH /admin/users/{id}`: Update user role (admin only)
- `DELETE /admin/users/{id}`: Delete user (admin only)
- `GET /admin/health`: System health status
- `GET /admin/refresh?feed_id=X`: Manual feed refresh
- `GET /health`: Simple health check

## Architecture

```
app/
├── api/                    # REST API endpoints
│   ├── routes.py          # Main API routes
│   ├── auth.py            # Authentication endpoints
│   ├── admin.py           # Admin endpoints (RBAC)
│   ├── subscriptions.py   # Subscription management
│   ├── collections.py     # Collections API
│   └── public.py          # Public profiles/RSS
├── core/                   # Core modules
│   ├── models.py          # Multi-user ORM models
│   ├── storage.py         # SQLite database layer
│   ├── auth_jwt.py        # JWT authentication
│   ├── config.py          # Settings and YAML parser
│   ├── fetcher.py         # HTTP client with caching
│   ├── parser.py          # RSS/Atom parser
│   ├── scheduler.py       # APScheduler jobs
│   ├── rate_limit.py      # Rate limiting
│   ├── theming.py         # Theme system
│   ├── migrations.py      # Database migrations
│   ├── maintenance.py     # Auto maintenance
│   ├── metrics.py         # Prometheus metrics
│   ├── opml.py            # OPML support
│   ├── websub.py          # WebSub real-time
│   └── ua.py              # User-Agent policy
├── web/
│   ├── server.py          # FastAPI app & routes
│   ├── templates/         # Jinja2 templates (legacy)
│   └── static/            # Static assets
├── assets/                # Logo and assets
└── main.py                # Entry point

frontend/                   # React frontend
├── src/
│   ├── app/              # Page components
│   ├── components/       # UI components
│   ├── lib/              # Utilities
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   └── types/            # TypeScript types
└── public/
    ├── manifest.json     # PWA manifest
    └── sw.js             # Service Worker
```

## Best Practices Implemented

- **Reddit Compliance**: Descriptive User-Agent with contact info
- **Rate Limiting**: Token bucket per host + global concurrency
- **Caching**: ETag/Last-Modified headers
- **Retry Logic**: Exponential backoff with jitter
- **Encoding Detection**: Automatic charset detection with chardet
- **Feed Validation**: Supports RSS, Atom, RDF, and JSON Feed
- **Deduplication**: GUID-based item deduplication
- **Health Monitoring**: Feed status tracking
- **Error Handling**: Graceful degradation
- **Theme Support**: System preference detection with manual override

## Supported Feed Types

- **RSS 0.90, 0.91, 0.92, 1.0, 2.0**: Standard RSS feeds
- **Atom 0.3, 1.0**: Atom feeds
- **RDF**: RDF feeds
- **JSON Feed**: JSON Feed format (https://jsonfeed.org/)

## Feed Sources

### Supported Sources

- **RSS/Atom**: Standard feeds
- **YouTube**: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- **Reddit**: `https://www.reddit.com/r/SUBREDDIT/.rss`
- **GitHub**: `https://github.com/USERNAME.atom`
- **Dev.to**: `https://dev.to/feed`

### RSSHub Integration

For TikTok/Instagram feeds, use a self-hosted RSSHub instance:

```yaml
- name: "TikTok User"
  url: "https://rsshub.your-domain.com/tiktok/user/username"
  interval_seconds: 1800
```

## Development

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python -m app.main
```

### Docker Development

```bash
# Build and run
docker compose up --build

# View logs
docker compose logs -f feeder

# Clean rebuild
docker compose down -v
docker compose up --build
```

## Monitoring

- **Health Check**: `/health` endpoint
- **Feed Status**: `/admin/health` for detailed status
- **Manual Refresh**: `/admin/refresh?feed_id=X`
- **Logs**: Docker logs show fetch operations

## Security

- User-Agent compliance with major platforms
- Rate limiting to prevent abuse
- Input validation and sanitization
- No external dependencies for core functionality
- Environment variables for sensitive configuration

## Theme Customization

The application supports automatic theme detection based on system preferences and manual toggle via the button in the header. Themes are stored in browser localStorage.

## Credits

Developed by [runawaydevil](https://github.com/runawaydevil) - 2025

## License

MIT License - Pablo Murad, 2025
