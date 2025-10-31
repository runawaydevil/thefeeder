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

# Log DATABASE_URL for debugging (mask password)
DB_URL_MASKED=$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/' 2>/dev/null || echo "$DATABASE_URL")
echo "   Full URL: ${DB_URL_MASKED}"

# Method 1: Try sed extraction
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):\([^/]*\).*/\1/p' 2>/dev/null)
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):\([^/]*\).*/\2/p' 2>/dev/null)
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p' 2>/dev/null)

echo "   Method 1 parsing - Host: ${DB_HOST:-[empty]}, Port: ${DB_PORT:-[empty]}, User: ${DB_USER:-[empty]}"

# Method 2: If sed failed, try awk
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ]; then
  echo "  ⚠️  Fallback parsing method (awk)..."
  DB_HOST=$(echo "$DATABASE_URL" | awk -F'@' '{print $2}' | awk -F':' '{print $1}' 2>/dev/null)
  DB_PORT=$(echo "$DATABASE_URL" | awk -F'@' '{print $2}' | awk -F':' '{print $2}' | awk -F'/' '{print $1}' 2>/dev/null)
  DB_USER=$(echo "$DATABASE_URL" | awk -F'://' '{print $2}' | awk -F':' '{print $1}' 2>/dev/null)
  echo "   Method 2 parsing - Host: ${DB_HOST:-[empty]}, Port: ${DB_PORT:-[empty]}, User: ${DB_USER:-[empty]}"
fi

# Default values if parsing still failed
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-thefeeder}

echo "   Final values - Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER"

# Verify pg_isready is available
if ! command -v pg_isready > /dev/null 2>&1; then
  echo "❌ ERROR: pg_isready command not found!"
  echo "   Installing postgresql-client..."
  apk add --no-cache postgresql-client > /dev/null 2>&1 || {
    echo "   Failed to install postgresql-client, trying alternative check..."
  }
fi

echo "⏳ Waiting for database to be ready (host: $DB_HOST, port: $DB_PORT, user: $DB_USER)..."
echo "   Using pg_isready for health check..."

# Wait for database to be ready with timeout and max attempts
MAX_ATTEMPTS=60
ATTEMPT=0
TIMEOUT=30

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  
  # Try pg_isready first
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -t 1 > /dev/null 2>&1; then
    echo "✅ Database is ready! (after $ATTEMPT attempt(s))"
    break
  fi
  
  # Log detailed error on specific attempts for debugging
  if [ $ATTEMPT -eq 10 ] || [ $ATTEMPT -eq 30 ] || [ $ATTEMPT -eq 50 ]; then
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS: Checking pg_isready status..."
    pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" 2>&1 || true
  fi
  
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    echo "  Database is unavailable - sleeping... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 1
  else
    echo "❌ ERROR: Database connection failed after $MAX_ATTEMPTS attempts!"
    echo "   Host: $DB_HOST"
    echo "   Port: $DB_PORT"
    echo "   User: $DB_USER"
    echo "   Please check:"
    echo "   1. Database container is running and healthy"
    echo "   2. DATABASE_URL is correct"
    echo "   3. Network connectivity between containers"
    exit 1
  fi
done

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

