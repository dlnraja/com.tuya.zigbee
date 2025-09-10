#!/usr/bin/env node
'use strict';

/**
 * Default configuration for Tuya Zigbee Homey App
 */

module.exports = {
  // Application settings
  app: {
    name: 'Tuya Zigbee',
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    debug: process.env.DEBUG === 'true' || false,
  },

  // Homey settings
  homey: {
    minVersion: '8.0.0',
    sdk: 3,
  },

  // Python service configuration
  pythonService: {
    enabled: true,
    port: process.env.PYTHON_SERVICE_PORT || 3000,
    host: process.env.PYTHON_SERVICE_HOST || 'localhost',
    logLevel: process.env.PYTHON_LOG_LEVEL || 'info',
  },

  // Device settings
  device: {
    discoveryInterval: 30000, // 30 seconds
    commandTimeout: 10000,    // 10 seconds
    maxRetries: 3,
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true' || false,
      path: process.env.LOG_PATH || 'logs',
      maxSize: '20m',
      maxFiles: '14d',
    },
    console: {
      enabled: true,
      colorize: true,
    },
  },

  // API configuration
  api: {
    enabled: true,
    port: process.env.API_PORT || 3001,
    basePath: '/api/v1',
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  },

  // Cache configuration
  cache: {
    ttl: 3600, // 1 hour in seconds
    checkPeriod: 600, // 10 minutes in seconds
  },

  // Feature flags
  features: {
    experimental: {
      newDeviceDiscovery: process.env.FEATURE_NEW_DEVICE_DISCOVERY === 'true' || false,
      enhancedLogging: process.env.FEATURE_ENHANCED_LOGGING === 'true' || false,
    },
  },

  // External services
  services: {
    homey: {
      apiUrl: 'https://api.athom.com',
      timeout: 10000, // 10 seconds
    },
    tuya: {
      baseUrl: 'https://openapi.tuyaeu.com',
      apiVersion: 'v1.0',
      timeout: 10000, // 10 seconds
    },
  },
};
