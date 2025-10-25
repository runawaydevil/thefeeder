"""
Structured logging configuration with JSON format.
"""

import logging
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Formatter that outputs JSON structured logs."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.now(ZoneInfo('UTC')).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        
        # Add extra fields if present
        if hasattr(record, 'feed_id'):
            log_data['feed_id'] = record.feed_id
        if hasattr(record, 'status_code'):
            log_data['status_code'] = record.status_code
        if hasattr(record, 'duration_ms'):
            log_data['duration_ms'] = record.duration_ms
        if hasattr(record, 'items_found'):
            log_data['items_found'] = record.items_found
        if hasattr(record, 'items_new'):
            log_data['items_new'] = record.items_new
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


def configure_logging(use_json: bool = True, level: str = "INFO"):
    """
    Configure logging with JSON structured format.
    
    Args:
        use_json: Use JSON formatter if True, plain text otherwise
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, level.upper()))
    
    # Set formatter
    if use_json:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    return root_logger

