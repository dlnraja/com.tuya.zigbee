"""
Advanced logging configuration for the Tuya Zigbee Bridge.
Provides structured logging with different log levels and output formats.
"""
import logging
import sys
import json
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime
from typing import Any, Dict, Optional

class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs logs in JSON format."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'name': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
            
        # Add any extra fields
        if hasattr(record, 'data'):
            log_entry['data'] = record.data
            
        return json.dumps(log_entry, ensure_ascii=False)

def setup_logger(
    name: str = 'tuya_zigbee',
    log_level: str = 'INFO',
    log_file: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> logging.Logger:
    """
    Configure and return a logger with both console and file handlers.
    
    Args:
        name: Logger name
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (optional)
        max_bytes: Maximum log file size before rotation
        backup_count: Number of backup log files to keep
        
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatters
    json_formatter = JSONFormatter()
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler if log file is specified
    if log_file:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(json_formatter)
        logger.addHandler(file_handler)
    
    return logger

def log_with_context(logger: logging.Logger, level: str, message: str, **context: Any) -> None:
    """
    Log a message with additional context data.
    
    Args:
        logger: Logger instance
        level: Log level (debug, info, warning, error, critical)
        message: Log message
        **context: Additional context data to include in the log
    """
    log_method = getattr(logger, level.lower(), logger.info)
    
    if context:
        # Create a log record with extra data
        log_record = logging.LogRecord(
            name=logger.name,
            level=log_method.level if hasattr(log_method, 'level') else logging.INFO,
            pathname='',
            lineno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        log_record.data = context
        logger.handle(log_record)
    else:
        log_method(message)

# Example usage
if __name__ == '__main__':
    logger = setup_logger(log_level='DEBUG', log_file='logs/tuya_zigbee.log')
    logger.info('Logger initialized')
    log_with_context(
        logger,
        'info',
        'Device connected',
        device_id='zigbee_123',
        status='connected',
        rssi=-65
    )
