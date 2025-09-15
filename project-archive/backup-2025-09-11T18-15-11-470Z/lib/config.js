#!/usr/bin/env node
'use strict';

'use strict';

/**
 * Application configuration
 * @module config
 */

module.exports = {
  // App configuration
  app: {
    id: 'com.tuya.zigbee',
    name: 'Tuya Zigbee',
    version: '1.0.0',
    debug: process.env.DEBUG === 'true' || false,
  },
  
  // Driver configuration
  drivers: {
    // Default polling interval in milliseconds
    pollingInterval: 30000,
    
    // Default timeout for device responses in milliseconds
    responseTimeout: 5000,
  },
  
  // Tuya specific configuration
  tuya: {
    // Base URL for Tuya API
    apiBaseUrl: 'https://openapi.tuya.com',
    
    // Default firmware update check interval (24 hours)
    firmwareCheckInterval: 24 * 60 * 60 * 1000,
  },
  
  // Zigbee specific configuration
  zigbee: {
    // Default Zigbee channel
    defaultChannel: 11,
    
    // Supported device types
    deviceTypes: [
      'plug',
      'switch',
      'sensor',
      'light',
      'thermostat',
      'cover',
      'lock',
      'button',
      'motion',
      'contact',
      'smoke',
      'water',
      'gas',
    ],
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true' || false,
      path: 'logs',
      filename: 'tuya-zigbee.log',
      maxSize: '10m',
      maxFiles: '14d',
    },
  },
  
  // API configuration
  api: {
    port: process.env.API_PORT || 3000,
    host: process.env.API_HOST || '0.0.0.0',
    basePath: '/api/v1',
  },
  
  // Feature flags
  features: {
    experimental: {
      enableAdvancedPairing: false,
      enableDeviceDebug: false,
    },
  },
};

// Export environment-based configuration
module.exports = (() => {
  const env = process.env.NODE_ENV || 'development';
  const config = { ...module.exports };
  
  // Development environment overrides
  if (env === 'development') {
    config.app.debug = true;
    config.logging.level = 'debug';
    config.features.experimental.enableDeviceDebug = true;
  }
  
  // Production environment overrides
  if (env === 'production') {
    config.app.debug = false;
    config.logging.level = 'warn';
    config.features.experimental.enableAdvancedPairing = false;
  }
  
  return config;
})();
