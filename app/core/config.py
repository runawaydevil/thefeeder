import logging
import os
from typing import Any
from zoneinfo import ZoneInfo

import yaml
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "Pablo Feeds"
    APP_PORT: int = 7389
    APP_BASE_URL: str = "https://feeder.1208.pro"

    # User Agent Policy
    USER_AGENT_BASE: str = "Feeder/2025 (+https://feeder.1208.pro; contato: pablo@pablomurad.com)"

    # Network Configuration
    GLOBAL_CONCURRENCY: int = 5
    PER_HOST_RPS: float = 0.5  # requests per second per host
    FETCH_TIMEOUT_SECONDS: int = 20

    # Retry Configuration
    RETRY_MAX_ATTEMPTS: int = 4
    RETRY_BASE_MS: int = 800
    RETRY_MAX_MS: int = 10000

    # Intervals
    DEFAULT_FETCH_INTERVAL_SECONDS: int = 600  # 10 minutes
    DEFAULT_TTL_SECONDS: int = 900  # 15 minutes

    # Feeds Configuration (YAML inline)
    FEEDS_YAML: str = ""

    # Feed Limits
    MAX_FEEDS: int = 150

    # Item Limits
    MAX_ITEMS: int = 1500

    # Database
    DB_PATH: str = "feeder.sqlite"

    # Security
    ALLOWED_HOSTS: str = "*"

    # Timezone Configuration
    TIMEZONE: str = "UTC"

    @property
    def tz(self) -> ZoneInfo:
        """Get configured timezone as ZoneInfo object."""
        try:
            return ZoneInfo(self.TIMEZONE)
        except Exception as e:
            logger.warning(f"Invalid timezone '{self.TIMEZONE}', falling back to UTC: {e}")
            return ZoneInfo("UTC")

    @property
    def feeds(self) -> list[dict[str, Any]]:
        """Load feeds from feeds.yaml file."""
        feeds_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'feeds.yaml')

        try:
            if os.path.exists(feeds_file):
                with open(feeds_file, encoding='utf-8') as f:
                    parsed_feeds = yaml.safe_load(f) or []
            else:
                # Fallback to FEEDS_YAML env var
                if not self.FEEDS_YAML:
                    return []
                parsed_feeds = yaml.safe_load(self.FEEDS_YAML) or []

            # Limit to MAX_FEEDS
            if len(parsed_feeds) > self.MAX_FEEDS:
                logger.warning(f"Feed limit exceeded: {len(parsed_feeds)} feeds configured, limiting to {self.MAX_FEEDS}")
                parsed_feeds = parsed_feeds[:self.MAX_FEEDS]

            return parsed_feeds
        except yaml.YAMLError as e:
            logger.error(f"Error parsing feeds: {e}")
            return []
        except Exception as e:
            logger.error(f"Error loading feeds.yaml: {e}")
            return []

    class Config:
        env_file = os.getenv("ENV_FILE", ".env")


# Global settings instance
settings = Settings()


