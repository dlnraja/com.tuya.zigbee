#!/usr/bin/env node
'use strict';

const winston = require('winston');
const config = require('@config');
const { format } = winston;
const { combine, timestamp, printf, colorize, json } = format;
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  // Add additional metadata if present
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }

  return log;
});

// Configure logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json(),
    logFormat
  ),
  defaultMeta: { service: config.app.name },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      ),
      level: 'debug', // Always show debug in console if enabled
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Add a stream for morgan logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Handle uncaught exceptions
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
    })
  );

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    throw reason;
  });
}

// Add a method to log API requests
logger.apiRequest = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.http(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });

  next();
};

module.exports = logger;
