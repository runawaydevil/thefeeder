#!/bin/sh
set -e

echo "🚀 Starting web container entrypoint..."

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

echo "🔄 Running database migrations..."
if ! npx prisma migrate deploy; then
  echo "❌ ERROR: Database migration failed!"
  echo "   This is a critical error. The application cannot start without migrations."
  exit 1
fi
echo "✅ Database migrations completed successfully"

echo "🌱 Running database seed..."

# Check if admin credentials are set
if [ -z "$ADMIN_EMAIL" ]; then
  echo "⚠️  WARNING: ADMIN_EMAIL not set, using default: admin@example.com"
else
  echo "   📧 Admin email: ${ADMIN_EMAIL}"
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "⚠️  WARNING: ADMIN_PASSWORD not set, using default password"
else
  echo "   🔐 Admin password: [SET]"
fi

# Try to run seed using prisma db seed first
echo "   Attempting: npx prisma db seed"
if npx prisma db seed 2>&1; then
  echo "✅ Database seed completed successfully via prisma db seed"
else
  echo "   ⚠️  prisma db seed failed, trying direct tsx execution..."
  # Fallback 1: Try npx tsx
  if npx tsx prisma/seed.ts 2>&1; then
    echo "✅ Database seed completed successfully via npx tsx"
  else
    echo "   ⚠️  npx tsx failed, trying absolute path..."
    # Fallback 2: Use absolute path to tsx binary
    if [ -f "/app/node_modules/.bin/tsx" ]; then
      if /app/node_modules/.bin/tsx prisma/seed.ts 2>&1; then
        echo "✅ Database seed completed successfully via absolute tsx path"
      else
        echo "❌ ERROR: Database seed failed with absolute path!"
        echo "   This is not critical, but admin user may not exist."
        echo "   You can create it manually later."
      fi
    else
      echo "❌ ERROR: tsx binary not found at /app/node_modules/.bin/tsx"
      echo "   This is not critical, but admin user may not exist."
      echo "   You can create it manually later."
    fi
  fi
fi

# Verify environment
echo "📋 Environment check:"
echo "   NODE_ENV: ${NODE_ENV:-not set}"
# Show first 30 chars of DATABASE_URL (portable sh syntax)
DB_URL_PREVIEW=$(echo "$DATABASE_URL" | cut -c1-30 2>/dev/null || echo "${DATABASE_URL}")
echo "   DATABASE_URL: ${DB_URL_PREVIEW}..."
echo "   REDIS_URL: ${REDIS_URL:-not set}"
echo "   WORKER_API_URL: ${WORKER_API_URL:-not set}"
echo "   ADMIN_EMAIL: ${ADMIN_EMAIL:-not set (using default)}"

echo "🚀 Starting Next.js server..."
exec npm start

