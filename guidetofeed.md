# Guide to Adding Feeds

This guide explains how to add RSS feeds to Pablo Feeds.

## Prerequisites

- Access to the server where Pablo Feeds is running
- SSH or file system access to edit `feeds.yaml`
- Basic understanding of YAML syntax

## Adding Feeds

### Method 1: Editing feeds.yaml (Recommended)

Feeds are configured in the `feeds.yaml` file located in the project root.

#### Step 1: Open feeds.yaml

```bash
nano feeds.yaml
# or
vim feeds.yaml
# or use your preferred editor
```

#### Step 2: Add Feed Entry

Add a new feed entry following this format:

```yaml
- name: "Feed Display Name"
  url: "https://example.com/feed.xml"
  interval_seconds: 1800
```

**Parameters:**
- `name`: Display name for the feed (shown in the UI)
- `url`: Full URL to the RSS/Atom feed
- `interval_seconds`: Update interval in seconds (default: 1800 = 30 minutes)

#### Step 3: Example Configuration

```yaml
# Pablo Feeds Configuration

- name: "Reddit - r/SelfHosting"
  url: "https://www.reddit.com/r/SelfHosting.rss"
  interval_seconds: 1200

- name: "WIRED"
  url: "https://www.wired.com/feed/rss"
  interval_seconds: 1800

- name: "Custom Blog"
  url: "https://blog.example.com/feed/"
  interval_seconds: 3600
```

#### Step 4: Restart the Service

After editing `feeds.yaml`, restart the service to load new feeds:

```bash
# Docker Compose
docker compose restart feeder

# Or restart the entire stack
docker compose down
docker compose up -d
```

### Method 2: Environment Variable (Legacy)

⚠️ **Deprecated**: This method is no longer recommended. Use `feeds.yaml` instead.

If you need to use environment variables, add feeds to `FEEDS_YAML` in your `.env` file:

```bash
FEEDS_YAML='
- name: "Example Feed"
  url: "https://example.com/feed.xml"
  interval_seconds: 1200
'
```

## Finding Feed URLs

### Common Feed Locations

Most websites provide feeds at these standard locations:

- `https://domain.com/feed/`
- `https://domain.com/rss/`
- `https://domain.com/atom.xml`
- `https://domain.com/index.xml`

### Popular Platforms

#### Reddit
```
https://www.reddit.com/r/SUBREDDIT.rss
```

#### WordPress Blogs
```
https://blogname.com/feed/
```

#### Medium
```
https://medium.com/feed/@username
```

#### Substack
```
https://newsletter.substack.com/feed
```

#### GitHub Releases
```
https://github.com/OWNER/REPO/releases.atom
```

### Discovering Feeds

Many websites include feed links in their HTML. Look for:
- `<link rel="alternate" type="application/rss+xml" href="...">`
- `<link rel="alternate" type="application/atom+xml" href="...">`

You can also use feed discovery tools:
- Use the `/admin/discover` endpoint: `http://your-server/admin/discover?url=https://website.com`
- Browser extensions like "RSS Subscription"

## Feed Formats Supported

Pablo Feeds supports the following feed formats:

- **RSS 2.0** - Most common format
- **Atom 1.0** - Modern, standardized format
- **RSS 1.0** - Older RSS format
- **JSON Feed** - Modern JSON-based format

## Best Practices

### Update Intervals

Choose appropriate intervals based on how frequently the feed updates:

- **High-frequency feeds** (news sites, Reddit): 600-1200 seconds (10-20 minutes)
- **Medium-frequency feeds** (blogs, newsletters): 1800-3600 seconds (30-60 minutes)
- **Low-frequency feeds** (rarely updated): 7200+ seconds (2+ hours)

### Feed Limits

- Maximum feeds: 150 (configurable via `MAX_FEEDS` in `.env`)
- Maximum items per feed: 100 (hard limit in parser)
- Total items in database: 1500 (configurable via `MAX_ITEMS` in `.env`)

### Performance Tips

1. **Avoid aggressive polling**: Don't set intervals below 300 seconds (5 minutes)
2. **Batch similar feeds**: Use similar update intervals for feeds from the same domain
3. **Monitor feed health**: Check `/admin/health` regularly
4. **Use degraded feeds**: Automatic degradation for stale feeds reduces load

## Managing Feeds

### Viewing Feed Status

Check feed health and status:

```bash
curl http://localhost:7389/admin/health
```

Or visit in browser: `http://your-server/admin/health`

### Manually Refreshing Feeds

Force an immediate update:

```bash
# Refresh all feeds
curl http://localhost:7389/admin/refresh

# Refresh specific feed (replace FEED_ID)
curl http://localhost:7389/admin/refresh?feed_id=1
```

### Removing Feeds

Simply remove the feed entry from `feeds.yaml` and restart the service.

**Note**: Existing items from removed feeds remain in the database but won't update.

## Troubleshooting

### Feed Not Updating

1. **Check feed URL**: Verify the URL is accessible
   ```bash
   curl -I https://example.com/feed.xml
   ```

2. **Check feed format**: Ensure it's valid RSS/Atom
   ```bash
   curl https://example.com/feed.xml | head -50
   ```

3. **Check logs**: Review application logs
   ```bash
   docker compose logs feeder
   ```

4. **Verify feed configuration**: Check `feeds.yaml` syntax
   ```bash
   python -c "import yaml; yaml.safe_load(open('feeds.yaml'))"
   ```

### Feed Showing as "Error"

Common causes:
- **Network timeout**: Feed server is slow or unreachable
- **Invalid feed format**: Feed XML/Atom is malformed
- **Rate limiting**: Too many requests to the same domain
- **Authentication required**: Feed requires login credentials

Solutions:
- Increase `FETCH_TIMEOUT_SECONDS` in `.env`
- Reduce `PER_HOST_RPS` if hitting rate limits
- Verify feed URL in browser

### Feed Degraded

Feeds are automatically marked as "degraded" if:
- No new items in 24 hours
- Recent fetch errors

Degraded feeds still update but less frequently.

## Advanced Configuration

### Custom Fetch Intervals

Set different intervals per feed:

```yaml
- name: "High Priority News"
  url: "https://news.com/feed.xml"
  interval_seconds: 600  # 10 minutes

- name: "Weekly Newsletter"
  url: "https://newsletter.com/feed.xml"
  interval_seconds: 3600  # 1 hour
```

### User-Agent Customization

Modify user agent in `.env`:

```bash
USER_AGENT_BASE="Feeder/2025 (+https://feeder.1208.pro; contato: your@email.com)"
```

This helps with:
- Feed server identification
- Reddit compliance (required for Reddit feeds)
- Polite web crawling

## API Access

Feeds can also be managed via the REST API:

```bash
# List all feeds
curl http://localhost:7389/api/feeds

# Get specific feed
curl http://localhost:7389/api/feeds/1

# Get feed items
curl http://localhost:7389/api/feeds/1/items
```

## Support

For issues or questions:
- Check logs: `docker compose logs feeder`
- Health check: `http://your-server/admin/health`
- GitHub Issues: [Report problems](https://github.com/runawaydevil/thefeeder/issues)

## Additional Resources

- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom 1.0 Specification](https://tools.ietf.org/html/rfc4287)
- [JSON Feed Specification](https://www.jsonfeed.org/)

