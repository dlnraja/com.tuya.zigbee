#!/usr/bin/env node
'use strict';

'use strict';

module.exports = {
  // Application settings
  app: {
    name: 'Tuya Zigbee',
    version: '1.0.0',
    minHomeyVersion: '7.0.0',
  },
  
  // Logging configuration
  logging: {
    level: process.env.DEBUG ? 'debug' : 'info',
    maxFiles: 7,
    maxSize: '5m',
    file: 'app.log',
    console: true,
    fileTransport: true,
  },
  
  // Tuya API configuration
  tuya: {
    // Default region (can be overridden in settings)
    defaultRegion: 'eu',
    
    // API endpoints by region
    endpoints: {
      us: 'https://openapi.tuyaus.com',
      eu: 'https://openapi.tuyaeu.com',
      cn: 'https://openapi.tuyacn.com',
      in: 'https://openapi.tuyain.com',
    },
    
    // Default API timeouts (in milliseconds)
    timeouts: {
      request: 10000, // 10 seconds
      refreshToken: 300000, // 5 minutes (before token expiry)
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
    },
  },
  
  // Device configuration
  devices: {
    // Default polling interval in milliseconds
    pollingInterval: 30000, // 30 seconds
    
    // Default device timeouts
    timeouts: {
      command: 5000, // 5 seconds
      discovery: 10000, // 10 seconds
    },
    
    // Supported device types
    types: {
      plug: 'tuya_plug',
      light: 'tuya_light',
      switch: 'tuya_switch',
      sensor: 'tuya_sensor',
    },
  },
  
  // Flow configuration
  flows: {
    triggers: {
      deviceDiscovered: 'device_discovered',
      deviceStateChanged: 'device_state_changed',
      deviceError: 'device_error',
    },
    conditions: {
      deviceIsOn: 'device_is_on',
      deviceIsOff: 'device_is_off',
    },
    actions: {
      turnOn: 'turn_on',
      turnOff: 'turn_off',
      toggle: 'toggle',
    },
  },
  
  // Error codes and messages
  errors: {
    AUTH_FAILED: 'Authentication failed. Please check your credentials.',
    DEVICE_NOT_FOUND: 'Device not found or not accessible.',
    DEVICE_OFFLINE: 'Device is currently offline.',
    RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
    NETWORK_ERROR: 'Network error occurred. Please check your connection.',
    INVALID_RESPONSE: 'Received an invalid response from the server.',
    UNKNOWN_ERROR: 'An unknown error occurred.',
  },
  
  // Default settings
  defaultSettings: {
    debug: false,
    region: 'eu',
    pollingInterval: 30000, // 30 seconds
  },
};
