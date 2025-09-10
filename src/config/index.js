#!/usr/bin/env node
'use strict';

'use strict';

const Joi = require('joi');
const path = require('path');
const { homedir } = require('os');

// Default configuration
const defaults = {
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
  
  // Python service settings
  python: {
    enabled: process.env.PYTHON_ENABLED !== 'false',
    path: process.env.PYTHON_PATH || path.join(__dirname, '..', 'python_service'),
    port: parseInt(process.env.PYTHON_PORT || '8000', 10),
    host: process.env.PYTHON_SERVICE_HOST || 'localhost',
    logLevel: process.env.PYTHON_LOG_LEVEL || 'info',
  },
  
  // Device settings
  devices: {
    discoveryInterval: parseInt(process.env.DEVICE_DISCOVERY_INTERVAL || '30000', 10), // 30 seconds
    commandTimeout: parseInt(process.env.DEVICE_COMMAND_TIMEOUT || '10000', 10), // 10 seconds
    maxRetries: parseInt(process.env.DEVICE_MAX_RETRIES || '3', 10),
  },
  
  // Tuya API settings
  tuya: {
    baseUrl: process.env.TUYA_BASE_URL || 'https://openapi.tuyaeu.com',
    apiKey: process.env.TUYA_API_KEY || '',
    apiSecret: process.env.TUYA_API_SECRET || '',
    version: process.env.TUYA_API_VERSION || '1.0',
    tokenRefreshInterval: parseInt(process.env.TUYA_TOKEN_REFRESH_INTERVAL || '3600000', 10), // 1 hour
  },
  
  // Zigbee settings
  zigbee: {
    panId: parseInt(process.env.ZIGBEE_PAN_ID || '0x1a62', 16),
    channel: parseInt(process.env.ZIGBEE_CHANNEL || '11', 10),
    networkKey: process.env.ZIGBEE_NETWORK_KEY || '01030507090B0D0F00020406080A0C0D10',
    backupPath: process.env.ZIGBEE_BACKUP_PATH || path.join(homedir(), '.homey', 'data', 'zigbee'),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true' || false,
      path: process.env.LOG_PATH || path.join(homedir(), '.homey', 'logs'),
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
    },
    console: {
      enabled: true,
      colorize: true,
    },
  },
  
  // API settings
  api: {
    enabled: process.env.API_ENABLED !== 'false',
    port: parseInt(process.env.API_PORT || '3000', 10),
    cors: {
      origin: process.env.API_CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  },
};

// Environment-specific overrides
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = {
  // Add environment-specific overrides here
  production: {
    DEBUG: false,
    logging: {
      level: 'warn'
    }
  },
  development: {
    DEBUG: true,
    logging: {
      level: 'debug'
    }
  },
  test: {
    python: {
      enabled: false
    },
    api: {
      enabled: false
    }
  }
};

// Merge configurations
const config = {
  ...defaults,
  ...(environmentConfig[environment] || {})
};

// Define Joi validation schema
const configSchema = Joi.object({
  app: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
    environment: Joi.string().valid('development', 'production', 'test').default('development'),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug', 'silly').default('info'),
    debug: Joi.boolean().default(false)
  }).required(),
  
  homey: Joi.object({
    minVersion: Joi.string().required(),
    sdk: Joi.number().valid(2, 3).required()
  }).required(),
  
  python: Joi.object({
    enabled: Joi.boolean().default(true),
    path: Joi.string().required(),
    port: Joi.number().port().required(),
    host: Joi.string().hostname().required(),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info')
  }).required(),
  
  devices: Joi.object({
    discoveryInterval: Joi.number().min(1000).required(),
    commandTimeout: Joi.number().min(1000).required(),
    maxRetries: Joi.number().min(0).required()
  }).required(),
  
  tuya: Joi.object({
    baseUrl: Joi.string().uri().required(),
    apiKey: Joi.string().required(),
    apiSecret: Joi.string().required(),
    version: Joi.string().required(),
    tokenRefreshInterval: Joi.number().min(300000).required()
  }).required(),
  
  zigbee: Joi.object({
    panId: Joi.number().min(0).max(0xFFFF).required(),
    channel: Joi.number().min(11).max(26).required(),
    networkKey: Joi.string().length(32).required(),
    backupPath: Joi.string().required()
  }).required(),
  
  logging: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug', 'silly').required(),
    file: Joi.object({
      enabled: Joi.boolean().default(false),
      path: Joi.string().required(),
      maxSize: Joi.string().required(),
      maxFiles: Joi.string().required()
    }).required(),
    console: Joi.object({
      enabled: Joi.boolean().default(true),
      colorize: Joi.boolean().default(true)
    }).required()
  }).required(),
  
  api: Joi.object({
    enabled: Joi.boolean().default(true),
    port: Joi.number().port().required(),
    cors: Joi.object({
      origin: Joi.string().required(),
      methods: Joi.array().items(Joi.string()).required()
    }).required()
  }).required()
}).options({ stripUnknown: true });

// Validate configuration
function validateConfig() {
  const { error, value: validatedConfig } = configSchema.validate(config, { abortEarly: false });
  
  if (error) {
    const validationErrors = error.details.map(detail => detail.message).join('\n');
    throw new Error(`Configuration validation failed:\n${validationErrors}`);
  }
  
  // Additional non-schema validations
  if (config.tuya.apiKey === '' && config.app.environment === 'production') {
    throw new Error('Tuya API key is required in production environment');
  }
  
  if (config.tuya.apiSecret === '' && config.app.environment === 'production') {
    throw new Error('Tuya API secret is required in production environment');
  }
  
  // Ensure backup directory exists
  const fs = require('fs');
  if (!fs.existsSync(config.zigbee.backupPath)) {
    fs.mkdirSync(config.zigbee.backupPath, { recursive: true });
  }
  
  return validatedConfig;
}

// Validate and freeze the configuration
let frozenConfig;
try {
  frozenConfig = Object.freeze(validateConfig());
} catch (error) {
  console.error('Failed to load configuration:', error.message);
  process.exit(1);
}

module.exports = frozenConfig;
