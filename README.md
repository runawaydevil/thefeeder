<div align="center">

# TheFeeder - Modern RSS Aggregator

<img src="apps/web/public/logo.png" width="150" height="150">

A modern RSS feed aggregator with daily email digest, built with Next.js 15, PostgreSQL, and Redis.

</div>

**Version:** 2.0.0 - Node.js Edition  
**Author:** Pablo Murad <pablomurad@pm.me>  
**Repository:** [GitHub](https://github.com/runawaydevil/thefeeder)

---

## Features

### Core Features
- 🎨 **Retro/Vaporwave Design**: Beautiful neon-themed UI with cyber aesthetic
- 📰 **RSS/Atom Feed Aggregation**: Supports RSS, Atom, and JSON feeds
- 🔍 **Auto Discovery**: Automatically discovers feeds from websites, Reddit, YouTube, GitHub
- 📧 **Daily Email Digest**: Send curated daily digests to subscribers
- 👤 **Admin Dashboard**: Full CRUD interface for managing feeds
- 🔐 **Secure Authentication**: NextAuth with role-based access control
- ⚡ **Background Jobs**: BullMQ for reliable feed fetching and email delivery
- 🌐 **Multi-timezone Support**: Configured timezone support (default: America/Sao_Paulo)
- 📱 **Responsive Design**: Works perfectly on desktop and mobile

### Feed Management
- **Auto Discovery**: Enter a URL and automatically find RSS feeds
- **Reddit Support**: Auto-converts subreddit URLs to RSS feeds
- **YouTube Support**: Detects YouTube channels and converts to RSS
- **GitHub Support**: Supports GitHub user and repository feeds
- **Rate Limiting**: Intelligent rate limiting (Reddit: 1 hour minimum)
- **User Agent Rotation**: Random user agents to prevent blocking
- **Custom Intervals**: Set refresh intervals per feed (minimum 10 minutes)

### Technical Stack
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **Email**: Nodemailer
- **Auth**: NextAuth v5

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
```bash
npm run dev
```

This starts both:
- Web app: http://localhost:7389
- Worker API: http://localhost:7388

### Default Admin Credentials

- **Email:** `admin@example.com`
- **Password:** `admin123`

⚠️ **Change these in production!**

---

## Docker Deployment

```bash
docker-compose -f docker-compose.node.yml up -d
```

This starts all services:
- Web app (port 3000)
- Worker (port 3001)
- PostgreSQL (port 15432)
- Redis (port 16379)

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
NEXTAUTH_URL=http://localhost:7389

# Worker API
WORKER_API_URL=http://localhost:7388
WORKER_API_TOKEN=your-token-here

# Timezone
TZ=America/Sao_Paulo

# Daily Digest
DIGEST_TIME=09:00

# SMTP (optional)
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASS=password
```

See `.env.example` for all available options.

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
└── docker-compose.node.yml
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

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

See [LICENSE](LICENSE) file.

---

**Built with ❤️ by Pablo Murad**
