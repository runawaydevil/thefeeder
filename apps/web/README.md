# TheFeeder - Next.js Application

Modern RSS feed aggregator with daily email digest, built with Next.js 15, PostgreSQL, and Redis.

## Features

- 🎨 Retro/vaporwave design theme
- 📰 RSS/Atom feed aggregation
- 📧 Daily email digest with customizable schedule
- 👤 Admin dashboard for feed management
- 🔐 Secure authentication with NextAuth
- ⚡ Background job processing with BullMQ

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure your `.env` file in the project root with:
   - Database URL
   - Redis URL
   - NextAuth secret
   - Worker API URL and token
   - SMTP settings (optional, for email)
   - Timezone (TZ=America/Sao_Paulo)

4. Run database migrations:
```bash
npm run prisma:migrate:dev
npm run prisma:seed
```

5. Start development server:
```bash
npm run dev
```

## Docker

Use the root `docker-compose.node.yml`:

```bash
docker-compose -f docker-compose.node.yml up -d
```

## Admin Access

Default admin credentials (set in `.env`):
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Change these credentials in production!**

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `src/` - Shared source code
  - `auth.ts` - NextAuth configuration
  - `lib/` - Utilities (Prisma, RSS parser, rate limiting)
  - `components/` - React components
- `prisma/` - Database schema and migrations
- `public/` - Static assets

## Worker

The background worker processes feeds and sends daily digests. See `apps/worker/README.md` for details.

