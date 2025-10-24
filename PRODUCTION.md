# Production Deployment Guide

## Security Hardening

### Reverse Proxy Setup

Deploy behind nginx or traefik with SSL:

```nginx
# nginx.conf example
server {
    listen 443 ssl http2;
    server_name feeds.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CSP Header (Content Security Policy)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
    
    location / {
        proxy_pass http://localhost:7389;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Production Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  feeder:
    build: .
    restart: always
    env_file: .env.production
    volumes:
      - feeder_db:/data
    environment:
      - DB_PATH=/data/feeder.sqlite
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    # Health checks
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7389/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    # Security options
    security_opt:
      - no-new-privileges:true
    # Read-only root
    read_only: true
    tmpfs:
      - /tmp

volumes:
  feeder_db:
    driver: local
```

### Environment Variables

Create `.env.production`:

```bash
# Application
APP_NAME="Pablo Feeds"
APP_PORT=7389
APP_BASE_URL="https://feeds.yourdomain.com"

# User Agent
USER_AGENT_BASE="PabloFeeds/0.0.1 (+https://feeds.yourdomain.com; contact: pablo@pablomurad.com)"

# Network
GLOBAL_CONCURRENCY=5
PER_HOST_RPS=0.5
FETCH_TIMEOUT_SECONDS=20

# Retry
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_MS=800
RETRY_MAX_MS=10000

# Intervals
DEFAULT_FETCH_INTERVAL_SECONDS=600
DEFAULT_TTL_SECONDS=900

# Feeds (your configuration)
FEEDS_YAML="..."

# Limits
MAX_FEEDS=1500

# Database
DB_PATH=/data/feeder.sqlite

# Security
ALLOWED_HOSTS=feeds.yourdomain.com
```

### Monitoring

Add monitoring endpoints:

```bash
# Health check
curl https://feeds.yourdomain.com/health

# Detailed status
curl https://feeds.yourdomain.com/admin/health
```

### Backup Strategy

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec feeder cp /data/feeder.sqlite /data/backup_feeder_$DATE.sqlite
docker exec feeder gzip /data/backup_feeder_$DATE.sqlite

# Keep last 7 days
find /data/backup_*.sqlite.gz -mtime +7 -delete
```

### Logging

Configure logging:

```bash
# Docker logging driver
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Updates

```bash
# Update procedure
git pull
docker compose down
docker compose build --no-cache
docker compose up -d

# Verify
docker compose logs -f feeder
curl https://feeds.yourdomain.com/health
```

## Performance Tuning

### Database Optimization

```python
# Add indexes for better performance
CREATE INDEX idx_item_published ON item(published DESC);
CREATE INDEX idx_item_feed_id ON item(feed_id);
CREATE INDEX idx_item_guid ON item(guid);
```

### Caching

Consider adding Redis for:
- Feed content caching
- Rate limit storage
- Session storage

### Load Balancing

For high traffic:
- Multiple feeder instances
- Load balancer (nginx, traefik)
- Shared database (PostgreSQL)

## Maintenance

### Regular Tasks

- Weekly: Check logs for errors
- Monthly: Update dependencies
- Quarterly: Review and optimize feeds
- Yearly: Security audit

### Troubleshooting

```bash
# Check logs
docker compose logs -f feeder

# Check database size
docker exec feeder du -h /data/feeder.sqlite

# Check feed status
curl https://feeds.yourdomain.com/admin/health

# Manual feed refresh
curl https://feeds.yourdomain.com/admin/refresh?feed_id=1
```

## Compliance

### GDPR

- No personal data stored
- User preferences in localStorage (client-side)
- Data can be deleted by clearing browser storage

### Privacy

- No tracking or analytics
- No external requests except for RSS feeds
- User-Agent includes contact information

## Checklist

Before going live:

- [ ] SSL certificate configured
- [ ] Firewall rules set
- [ ] Environment variables configured
- [ ] Database backup configured
- [ ] Monitoring set up
- [ ] Logs configured
- [ ] Error alerting enabled
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Documentation updated

