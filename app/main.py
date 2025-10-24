"""
Main entry point for Pablo Feeds application.
Initializes database, scheduler, and starts the web server.
"""

import uvicorn
from app.core.config import settings
from app.core.logging_config import configure_logging


def main():
    """Main application entry point."""
    # Configure structured logging
    configure_logging(use_json=True, level="INFO")
    
    print(f"Starting {settings.APP_NAME}...")
    print(f"Database: {settings.DB_PATH}")
    print(f"Port: {settings.APP_PORT}")
    print(f"Feeds configured: {len(settings.feeds)}")
    
    # Start the web server
    uvicorn.run(
        "app.web.server:app",
        host="0.0.0.0",
        port=settings.APP_PORT,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    main()
