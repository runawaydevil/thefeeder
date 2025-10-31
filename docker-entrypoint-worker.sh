#!/bin/sh
set -e

echo "🚀 Starting worker container entrypoint..."

# Extract database connection details from DATABASE_URL with robust parsing
# Format: postgresql://user:password@host:port/database
# Try multiple parsing methods for robustness

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

echo "📋 DATABASE_URL detected (format: postgresql://user:pass@host:port/db)"

# Method 1: Try sed extraction
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):\([^/]*\).*/\1/p' 2>/dev/null)
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):\([^/]*\).*/\2/p' 2>/dev/null)
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p' 2>/dev/null)

# Method 2: If sed failed, try awk
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ]; then
  echo "  ⚠️  Fallback parsing method..."
  DB_HOST=$(echo "$DATABASE_URL" | awk -F'@' '{print $2}' | awk -F':' '{print $1}' 2>/dev/null)
  DB_PORT=$(echo "$DATABASE_URL" | awk -F'@' '{print $2}' | awk -F':' '{print $2}' | awk -F'/' '{print $1}' 2>/dev/null)
  DB_USER=$(echo "$DATABASE_URL" | awk -F'://' '{print $2}' | awk -F':' '{print $1}' 2>/dev/null)
fi

# Default values if parsing still failed
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-thefeeder}

echo "⏳ Waiting for database to be ready (host: $DB_HOST, port: $DB_PORT, user: $DB_USER)..."

# Wait for database to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
  echo "  Database is unavailable - sleeping..."
  sleep 1
done

echo "✅ Database is ready!"

# Verify required environment variables
if [ -z "$REDIS_URL" ]; then
  echo "⚠️  WARNING: REDIS_URL not set, using default: redis://redis:6379"
fi

# Verify environment
echo "📋 Environment check:"
echo "   NODE_ENV: ${NODE_ENV:-not set}"
# Show first 30 chars of DATABASE_URL (portable sh syntax)
DB_URL_PREVIEW=$(echo "$DATABASE_URL" | cut -c1-30 2>/dev/null || echo "${DATABASE_URL}")
echo "   DATABASE_URL: ${DB_URL_PREVIEW}..."
echo "   REDIS_URL: ${REDIS_URL:-not set}"
echo "   WORKER_API_PORT: ${WORKER_API_PORT:-3001 (default)}"
echo "   TZ: ${TZ:-not set}"
echo "   DIGEST_TIME: ${DIGEST_TIME:-09:00 (default)}"

WORKER_PORT=${WORKER_API_PORT:-3001}
echo "📡 Worker will listen on port: $WORKER_PORT"

echo "🚀 Starting worker..."
exec npm start

