<div align="center">

# TheFeeder - Modern RSS Aggregator

<img src="apps/web/public/logo.png" width="150" height="150">

A modern RSS feed aggregator with daily email digest, built with Next.js 15, PostgreSQL, and Redis.

</div>

## Screenshots

<div align="center">

![TheFeeder Interface](public/f1.png)

![TheFeeder Dashboard](public/f2.png)

</div>

**Version:** 2.0.0 - Node.js Edition  
**Author:** Pablo Murad <pablomurad@pm.me>  
**Repository:** [GitHub](https://github.com/runawaydevil/thefeeder)

---

## Features

### Core Features
- 🎨 **Dual Theme System**: Switch between Vaporwave (retro neon) and Clean (modern minimal) themes
- 📰 **RSS/Atom Feed Aggregation**: Supports RSS, Atom, and JSON feeds
- 🔍 **Auto Discovery**: Automatically discovers feeds from websites, Reddit, YouTube, GitHub
- 👍 **Article Interactions**: Like/dislike articles and share on social media (no login required)
  - Anonymous voting system with localStorage persistence
  - Share to Twitter, Facebook, LinkedIn, WhatsApp
  - Copy link to clipboard with one click
  - Rate limiting to prevent abuse
- 📧 **Daily Email Digest**: Send curated daily digests to subscribers
- 👤 **Admin Dashboard**: Full CRUD interface for managing feeds
- 🔐 **Secure Authentication**: NextAuth with role-based access control
- ⚡ **Background Jobs**: BullMQ for reliable feed fetching and email delivery
- 🌐 **Multi-timezone Support**: Configured timezone support (default: America/Sao_Paulo)
- 📱 **Responsive Design**: Works perfectly on desktop and mobile

### Feed Management
- **Auto Discovery**: Enter a URL and automatically find RSS feeds
- **OPML Import/Export**: Import and export feed lists via OPML files
- **Duplicate Prevention**: Automatic URL normalization prevents duplicate feeds
- **Reddit Support**: Auto-converts subreddit URLs to RSS feeds
- **YouTube Support**: Detects YouTube channels and converts to RSS
- **GitHub Support**: Supports GitHub user and repository feeds
- **Rate Limiting**: Intelligent rate limiting (Reddit: 1 hour minimum)
- **User Agent Rotation**: Random user agents to prevent blocking
- **Custom Intervals**: Set refresh intervals per feed (minimum 10 minutes)
- **Immediate Fetch**: New feeds are automatically fetched upon creation or import
- **Auto Cleanup**: Automatically maintains up to 50,000 articles (oldest are removed)

### Article Interactions

- **Like/Dislike System**: Vote on articles without creating an account
  - One vote per person (tracked via localStorage)
  - Switch between like and dislike
  - Real-time vote count updates
  - Persistent across page reloads
- **Social Sharing**: Share articles on multiple platforms
  - Twitter, Facebook, LinkedIn, WhatsApp
  - Copy link to clipboard with one click
  - Mobile-friendly share menu
  - Keyboard accessible

### Security Features

- **Rate Limiting**: Distributed rate limiting using Redis to prevent abuse
  - Subscriber endpoints: 5 requests per minute per IP
  - Vote endpoints: 5 requests per minute per IP
  - Feed discovery endpoints: Rate limiting with intelligent intervals
  - Redis-based for multi-instance deployments
- **HTML Sanitization**: All HTML content from feeds is sanitized to prevent XSS attacks
- **Security Headers**: Comprehensive security headers including CSP, HSTS, and X-Frame-Options
- **Input Validation**: Robust input validation on all API endpoints
- **Vote Protection**: Basic anti-spam measures for voting system

### Technical Stack
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **Email**: Nodemailer
- **Auth**: NextAuth v5

---

## Theme System

TheFeeder includes a dual-theme system that allows users to switch between two distinct visual styles:

### Available Themes

#### Vaporwave Theme (Default)
- Retro 80s/90s aesthetic with neon colors
- Pink (#ff006e) and cyan (#00d9ff) accents
- Dark purple gradient background
- Orbitron font for headings
- Glowing text effects and scanlines
- Grid and star visual effects

#### Clean Theme
- Modern, minimal design
- Blue (#0066CC) and black accents
- White background with subtle grays
- System fonts for optimal readability
- Subtle shadows and clean borders
- No visual effects for distraction-free reading

### How to Switch Themes

1. Look for the **THEME** button in the footer of any page
2. Click to toggle between Vaporwave (🎨) and Clean (📄) themes
3. Your preference is automatically saved to localStorage
4. The theme persists across browser sessions and tabs

### Theme Features

- **Instant switching**: No page reload required
- **Smooth transitions**: 300ms animated color changes
- **Cross-tab sync**: Theme changes sync across all open tabs
- **Accessibility**: Respects `prefers-reduced-motion` for users who need it
- **No flash**: Theme loads before page render to prevent flashing

### For Developers

The theme system uses CSS variables for easy customization. See the [Developer Guide](.kiro/specs/theme-switcher/design.md) for details on:
- Adding new themes
- Customizing existing themes
- Using theme variables in components
- Theme architecture and implementation

---

## Quick Start

### Prerequisites
- Node.js 20+ 
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/runawaydevil/thefeeder.git
cd thefeeder
```

2. **Install dependencies:**
```bash
npm run install:all
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Setup database:**
```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

5. **Start development servers:**

**Option A: Local Development (without Docker)**
```bash
npm run dev
```

This starts both:
- Web app: http://localhost:7389
- Worker API: http://localhost:7388

**Option B: Docker Development**
```bash
docker compose up -d --build
```

This starts all services:
- Web app: http://localhost:8041
- Worker API: http://localhost:7388
- PostgreSQL: http://localhost:15432
- Redis: http://localhost:16379

### Default Admin Credentials

- **Email:** `admin@example.com`
- **Password:** `admin123`

⚠️ **Change these in production!**

---

## Docker Deployment

```bash
docker compose up -d --build
```

This starts all services:
- **Web app: http://localhost:8041** (porta externa 8041 → interna 3000)
- **Worker API: http://localhost:7388** (porta externa 7388 → interna 3001)
- **PostgreSQL: http://localhost:15432** (porta externa 15432 → interna 5432)
- **Redis: http://localhost:16379** (porta externa 16379 → interna 6379)

---

## Environment Variables

Key variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:15432/thefeeder

# Redis
REDIS_URL=redis://localhost:16379

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://feeder.works

# Site URL
NEXT_PUBLIC_SITE_URL=https://feeder.works

# Worker API
WORKER_API_URL=http://localhost:7388
WORKER_API_TOKEN=your-token-here

# Timezone
TZ=America/Sao_Paulo

# Daily Digest
DIGEST_TIME=09:00

# SMTP (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com

# Worker API Configuration
WORKER_API_PORT=7388

# Admin (for seed script)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

See `.env.example` for all available options.

---

## Email Configuration

TheFeeder sends daily digest emails to subscribers. Proper email configuration is essential for deliverability and avoiding spam filters.

### SMTP Settings

Configure these environment variables in your `.env` file:

```env
# SMTP Server Configuration
SMTP_HOST=smtp.example.com          # Your SMTP server hostname
SMTP_PORT=587                        # Port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                    # Use SSL (true for port 465, false for 587)
SMTP_USER=user@example.com          # SMTP username
SMTP_PASS=your-password-here        # SMTP password
SMTP_FROM=noreply@example.com       # From email address
```

**Common SMTP Providers:**

- **Gmail**: `smtp.gmail.com:587` (requires App Password)
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **Amazon SES**: `email-smtp.us-east-1.amazonaws.com:587`
- **Postmark**: `smtp.postmarkapp.com:587`

### DNS Configuration for Deliverability

To avoid spam filters and improve email deliverability, configure these DNS records for your domain:

#### 1. SPF Record

SPF (Sender Policy Framework) authorizes which mail servers can send email on behalf of your domain.

Add a TXT record to your domain's DNS:

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.yourmailprovider.com ~all
```

**Examples:**
- Gmail: `v=spf1 include:_spf.google.com ~all`
- SendGrid: `v=spf1 include:sendgrid.net ~all`
- Mailgun: `v=spf1 include:mailgun.org ~all`

#### 2. DKIM Record

DKIM (DomainKeys Identified Mail) adds a digital signature to your emails.

1. Contact your SMTP provider to get your DKIM keys
2. Add the TXT record they provide to your DNS

**Example:**
```
Type: TXT
Name: default._domainkey
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

#### 3. DMARC Record

DMARC (Domain-based Message Authentication) tells receiving servers what to do with emails that fail SPF/DKIM checks.

Add a TXT record:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100; adkim=s; aspf=s
```

**Policy Options:**
- `p=none` - Monitor only (recommended for testing)
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Reject suspicious emails entirely

### Testing Email Delivery

#### 1. Test with Mail Tester

[Mail Tester](https://www.mail-tester.com) provides a comprehensive spam score:

1. Send a test digest to the address provided by Mail Tester
2. Check your score (aim for 8/10 or higher)
3. Review recommendations for improvement

#### 2. Check Authentication

Verify your SPF, DKIM, and DMARC records are working:

1. Send a test email to your Gmail account
2. Open the email and click "Show original"
3. Look for:
   - `SPF: PASS`
   - `DKIM: PASS`
   - `DMARC: PASS`

#### 3. Development Mode

When `SMTP_HOST` is not configured, emails are logged to the console instead of being sent. This is useful for development and testing.

### Email Features

TheFeeder's email system includes:

- **Table-based HTML layout** - Compatible with all email clients including Outlook
- **Inline CSS** - Ensures styles render correctly
- **Plain text version** - Improves deliverability and accessibility
- **Responsive design** - Optimized for mobile devices
- **List-Unsubscribe header** - One-click unsubscribe in Gmail and other clients
- **Proper headers** - Message-ID, Precedence, and other anti-spam headers
- **Vaporwave theme** - Matches the website's aesthetic

### Troubleshooting

**Emails not sending:**
- Check SMTP credentials are correct
- Verify SMTP_HOST and SMTP_PORT are set
- Check worker logs for errors: `docker compose logs worker`

**Emails going to spam:**
- Configure SPF, DKIM, and DMARC records
- Test with Mail Tester
- Ensure FROM address matches your domain
- Check that SMTP provider allows your sending volume

**Emails not rendering correctly:**
- The new email system uses table-based layout for maximum compatibility
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Check HTML is valid

---

## Project Structure

```
thefeeder/
├── apps/
│   ├── web/              # Next.js web application
│   │   ├── app/          # Pages and API routes
│   │   ├── src/          # Components and utilities
│   │   └── prisma/       # Database schema
│   └── worker/           # Background worker (BullMQ)
│       └── src/          # Job processors
├── .env                  # Environment variables (root)
├── .env.example         # Environment template
├── package.json          # Root package.json with scripts
├── docker-compose.yml    # Docker Compose configuration
└── Dockerfile            # Multi-stage Dockerfile
```

---

## Scripts

From the root directory:

```bash
npm run dev              # Start web + worker in dev mode
npm run build            # Build both services
npm run start            # Start both in production
npm run install:all      # Install all dependencies
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate:dev  # Run migrations
npm run prisma:seed      # Seed database
```

---

## Development

### Running Individual Services

```bash
# Web app only
cd apps/web && npm run dev

# Worker only
cd apps/worker && npm run dev
```

### Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create migration
npm run prisma:migrate:dev

# Reset database
cd apps/web && npx prisma migrate reset
```

---

## Feed Discovery

The admin dashboard includes an auto-discovery feature:

1. Click "🔍 Discover" in the feeds manager
2. Enter a URL (website, Reddit, YouTube, GitHub, etc.)
3. Select a discovered feed to add it

Supported formats:
- Regular websites (searches for RSS/Atom links)
- Reddit: `r/subreddit` or `https://reddit.com/r/subreddit`
- YouTube: Channel URLs or channel IDs
- GitHub: User or repository URLs

## OPML Import/Export

You can import and export feed lists via OPML files:

1. **Import OPML**: Click "📤 Import OPML" in the feeds manager and select an OPML file
2. **Export OPML**: Click "📥 Export OPML" to download your current feed list

The system automatically:
- Normalizes URLs to prevent duplicates
- Triggers immediate fetch for all imported feeds
- Skips feeds that already exist

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem:** `Error: Can't reach database server`

**Solutions:**
- Verify PostgreSQL is running: `docker compose ps` or `pg_isready`
- Check `DATABASE_URL` in `.env` matches your PostgreSQL instance
- Ensure database exists: `createdb thefeeder` (if using local PostgreSQL)
- For Docker: Wait for database health check to pass before starting web app

#### Redis Connection Errors

**Problem:** `Error: Redis connection failed`

**Solutions:**
- Verify Redis is running: `docker compose ps` or `redis-cli ping`
- Check `REDIS_URL` in `.env` is correct
- Ensure Redis port is accessible (default: 6379 or 16379 in Docker)
- Restart Redis: `docker compose restart redis`

#### Port Already in Use

**Problem:** `Error: Port 7389 already in use`

**Solutions:**
- Change port in `apps/web/package.json`: `"dev": "next dev -p <new-port>"`
- Kill process using the port:
  - Windows: `netstat -ano | findstr :7389` then `taskkill /PID <pid> /F`
  - Linux/Mac: `lsof -ti:7389 | xargs kill`
- Use different ports for web and worker services

#### Prisma Migration Errors

**Problem:** `Error: Migration failed`

**Solutions:**
- Reset database: `cd apps/web && npx prisma migrate reset` (⚠️ deletes all data)
- Check database connection: `npx prisma db pull` to verify schema
- Generate Prisma client: `npm run prisma:generate`
- Check for schema conflicts in `apps/web/prisma/schema.prisma`

#### Worker Not Fetching Feeds

**Problem:** Feeds not updating automatically

**Solutions:**
- Verify worker is running: Check logs with `docker compose logs worker` or `cd apps/worker && npm run dev`
- Check Redis connection (worker uses Redis for job queue)
- Verify `WORKER_API_URL` and `WORKER_API_TOKEN` are set correctly
- Check worker logs for errors: `npm run dev:worker` and look for error messages
- Manually trigger feed fetch from admin dashboard

#### NextAuth Session Issues

**Problem:** Can't login or session expires immediately

**Solutions:**
- Verify `NEXTAUTH_SECRET` is set (required for production)
- Check `NEXTAUTH_URL` matches your domain (including protocol)
- Clear browser cookies and try again
- Check database - ensure User table exists and admin user is created
- Run seed script: `npm run prisma:seed`

#### Build Errors

**Problem:** `Error during build`

**Solutions:**
- Clear `.next` folder: `rm -rf apps/web/.next` (Linux/Mac) or `rmdir /s apps\web\.next` (Windows)
- Reinstall dependencies: `rm -rf node_modules apps/web/node_modules apps/worker/node_modules && npm run install:all`
- Verify Node.js version: `node --version` (requires 20+)
- Check TypeScript errors: `npm run typecheck`

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/runawaydevil/thefeeder/issues)
2. Review logs: `docker compose logs` or check console output
3. Verify all environment variables are set correctly
4. Ensure all prerequisites are installed and up to date
5. Open a new issue with:
   - Error messages (full stack trace)
   - Steps to reproduce
   - Environment details (OS, Node.js version, etc.)
   - Relevant log excerpts

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

See [LICENSE](LICENSE) file.

---

**Built with ❤️ by Pablo Murad**
