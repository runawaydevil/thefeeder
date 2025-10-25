FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app /app/app
COPY feeds.yaml /app/

# Verify feeds.yaml is present
RUN test -f /app/feeds.yaml || (echo "ERROR: feeds.yaml not found" && exit 1)

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 7389

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7389/health || exit 1

# Run the application
CMD ["python", "app/main.py"]
