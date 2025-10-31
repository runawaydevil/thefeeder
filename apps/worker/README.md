# TheFeeder Worker

Background worker that processes RSS feeds and sends daily email digests.

## Features

- Automatic RSS feed fetching with configurable intervals (min 10 minutes)
- Daily email digest generation and sending
- Job queue management with BullMQ and Redis

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env` in the project root:
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
TZ=America/Sao_Paulo
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@thefeeder.com
DIGEST_TIME=09:00
WORKER_API_PORT=7388
```

3. Run Prisma generate:
```bash
npx prisma generate
```

4. Start worker:
```bash
npm run dev  # Development
npm start    # Production
```

## How it works

- **Feed Fetching**: Schedules jobs for each active feed based on its `refreshIntervalMinutes`
- **Daily Digest**: Sends a daily email at the configured time (default 9 AM) to all approved subscribers
- Jobs are retried automatically on failure

## Docker

The worker runs in a separate Docker container. See root `docker-compose.node.yml`.

