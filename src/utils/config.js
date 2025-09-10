#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const Joi = require('joi');
const logger = require('./logger');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define the configuration schema
const envVarsSchema = Joi.object()
  .keys({
    // App configuration
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().default('Tuya Zigbee'),
    APP_VERSION: Joi.string().default('3.0.0'),
    
    // Logging
    LOG_LEVEL: Joi.string()
      .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
      .default('info'),
    LOG_TO_FILE: Joi.boolean().default(false),
    LOG_PATH: Joi.string().default('logs'),
    
    // API configuration
    API_PREFIX: Joi.string().default('/api/v1'),
    API_DOCS_ENABLED: Joi.boolean().default(true),
    
    // Security
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30),
    
    // Database
    DB_HOST: Joi.string().default('localhost'),
    DB_PORT: Joi.number().default(27017),
    DB_NAME: Joi.string().default('tuya_zigbee'),
    DB_USER: Joi.string(),
    DB_PASSWORD: Joi.string(),
    
    // Redis
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string(),
    
    // Tuya API
    TUYA_API_KEY: Joi.string(),
    TUYA_API_SECRET: Joi.string(),
    
    // Homey
    HOMEY_API_KEY: Joi.string(),
    HOMEY_API_URL: Joi.string().default('https://api.athom.com'),
    
    // Feature flags
    FEATURE_NEW_DEVICE_DISCOVERY: Joi.boolean().default(false),
    FEATURE_ENHANCED_LOGGING: Joi.boolean().default(false),
  })
  .unknown();

// Validate environment variables
const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  logger.error(`Config validation error: ${error.message}`);
  process.exit(1);
}

// Build configuration object
const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  app: {
    name: envVars.APP_NAME,
    version: envVars.APP_VERSION,
  },
  logger: {
    level: envVars.LOG_LEVEL,
    file: {
      enabled: envVars.LOG_TO_FILE,
      path: envVars.LOG_PATH,
    },
  },
  api: {
    prefix: envVars.API_PREFIX,
    docs: {
      enabled: envVars.API_DOCS_ENABLED,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  },
  db: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    url: envVars.DB_USER && envVars.DB_PASSWORD
      ? `mongodb://${envVars.DB_USER}:${envVars.DB_PASSWORD}@${envVars.DB_HOST}:${envVars.DB_PORT}/${envVars.DB_NAME}?authSource=admin`
      : `mongodb://${envVars.DB_HOST}:${envVars.DB_PORT}/${envVars.DB_NAME}`,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    url: envVars.REDIS_PASSWORD
      ? `redis://:${envVars.REDIS_PASSWORD}@${envVars.REDIS_HOST}:${envVars.REDIS_PORT}`
      : `redis://${envVars.REDIS_HOST}:${envVars.REDIS_PORT}`,
  },
  tuya: {
    apiKey: envVars.TUYA_API_KEY,
    apiSecret: envVars.TUYA_API_SECRET,
  },
  homey: {
    apiKey: envVars.HOMEY_API_KEY,
    apiUrl: envVars.HOMEY_API_URL,
  },
  features: {
    newDeviceDiscovery: envVars.FEATURE_NEW_DEVICE_DISCOVERY,
    enhancedLogging: envVars.FEATURE_ENHANCED_LOGGING,
  },
};

// Create a deep freeze of the config object
const deepFreeze = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      deepFreeze(obj[key]);
    }
  });
  return Object.freeze(obj);
};

// Export the frozen config object
module.exports = deepFreeze(config);
