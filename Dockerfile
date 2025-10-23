FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    httpx[http2]==0.25.2 \
    feedparser==6.0.10 \
    pydantic-settings==2.1.0 \
    python-dotenv==1.0.0 \
    sqlmodel==0.0.14 \
    aiosqlite==0.19.0 \
    apscheduler==3.10.4 \
    backoff==2.2.1 \
    pyyaml==6.0.1 \
    jinja2==3.1.2 \
    python-multipart==0.0.6 \
    chardet==5.2.0

# Copy application code
COPY app /app/app

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 7389

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7389/health || exit 1

# Run the application
CMD ["python", "app/main.py"]
