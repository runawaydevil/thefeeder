# Pablo Feeds - Minimalist RSS Aggregator

A minimalist, conservative RSS feed aggregator built with Python FastAPI and Jinja2 templates.

## Features

- **Minimalist Design**: Clean, "boxy" interface with system fonts
- **Dark/Light Theme**: Automatic theme detection with manual toggle
- **RSS/Atom Support**: Parses feeds with feedparser (supports RSS, Atom, JSON Feed)
- **Smart Fetching**: ETag/Last-Modified caching, rate limiting, retry with backoff
- **Per-Feed Intervals**: Custom update intervals per feed
- **Feed Limit**: Maximum 1500 feeds supported
- **Deduplication**: Prevents duplicate articles
- **Numeric Pagination**: Classic page numbers (1, 2, 3...)
- **Responsive**: Works on mobile and desktop
- **Docker Ready**: Complete containerization setup

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

## Configuration

### Environment Variables

- `APP_NAME`: Application name (displayed in header)
- `USER_AGENT_BASE`: User-Agent string (Reddit-compliant)
- `FEEDS_YAML`: YAML string with feed configurations
- `PER_HOST_RPS`: Requests per second per host (default: 0.5)
- `DEFAULT_FETCH_INTERVAL_SECONDS`: Default update interval (default: 600)
- `MAX_FEEDS`: Maximum number of feeds (default: 1500)

### Feed Configuration

Feeds are configured in the `FEEDS_YAML` environment variable:

```yaml
- name: "Feed Name"
  url: "https://example.com/feed.xml"
  interval_seconds: 1200
```

## API Endpoints

- `GET /`: Main page with articles
- `GET /admin/refresh?feed_id=X`: Manual feed refresh
- `GET /admin/health`: System health status
- `GET /admin/feeds`: List all feeds
- `GET /health`: Simple health check

## Architecture

```
app/
├── core/
│   ├── config.py      # Settings and YAML parser
│   ├── fetcher.py     # HTTP client with caching
│   ├── parser.py      # RSS/Atom parser with encoding detection
│   ├── storage.py     # SQLite database
│   ├── scheduler.py   # APScheduler jobs
│   ├── rate_limit.py  # Rate limiting
│   └── ua.py          # User-Agent policy
├── web/
│   ├── server.py      # FastAPI routes
│   ├── templates/     # Jinja2 templates
│   └── static/        # CSS, JS, and assets
└── main.py           # Entry point
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
