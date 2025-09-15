#!/usr/bin/env node
'use strict';

'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');
const path = require('path');
const fs = require('fs');

// Load configuration
const config = require('./config');

// Load services
const PythonService = require('./services/python');
const DeviceManager = require('./services/device-manager');
const TuyaApiService = require('./services/TuyaApiService');
const ZigbeeService = require('./services/ZigbeeService');

// Load utils
const logger = require('./utils/logger');
const { AppError } = require('./utils/errorHandler');

// Set up module aliases for cleaner imports
require('module-alias/register');

/**
 * Main application class for Tuya Zigbee integration
 * @extends Homey.App
 */
class TuyaZigbeeApp extends Homey.App {

  /**
   * Application initialization
   * @async
   */
  async onInit() {
    try {
      // Initialize logger
      this.logger = new Log({
        homey: this.homey,
        logLevel: config.DEBUG ? 'debug' : 'info'
      });

      this.logger.info('🚀 Initializing Tuya Zigbee App...');
      this.logger.debug(`App version: ${this.manifest.version}`);
      this.logger.debug(`Homey version: ${this.homey.version}`);
      this.logger.debug(`Node.js version: ${process.version}`);

      // Ensure data directories exist
      this.ensureDirectories();

      // Initialize services
      await this.initializeServices();

      // Register event listeners
      this.registerEventListeners();

      // Start services
      await this.startServices();

      this.logger.info('✅ App initialized successfully');

      // Emit ready event
      this.emit('app:ready');

    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError(
          'App initialization failed',
          500,
          'APP_INIT_ERROR',
          { error: error.message, stack: error.stack }
        );

      this.logger.error('❌ App initialization failed:', appError);

      // Emit error event
      this.emit('app:error', appError);

      throw appError;
    }
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    try {
      const directories = [
        path.join(this.homey.settings.getUserPath(), 'logs'),
        path.join(this.homey.settings.getUserPath(), 'data'),
        path.join(this.homey.settings.getUserPath(), 'cache')
      ];

      directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          this.logger.debug(`Created directory: ${dir}`);
        }
      });
    } catch (error) {
      this.logger.error('Failed to create required directories:', error);
      throw new AppError(
        'Failed to initialize app directories',
        500,
        'DIRECTORY_INIT_ERROR',
        { error }
      );
    }
  }

  /**
   * Initialize application services
   */
  async initializeServices() {
    try {
      // Initialize Tuya API service
      this.tuyaApi = new TuyaApiService({
        baseUrl: config.tuya.baseUrl,
        apiKey: config.tuya.apiKey,
        apiSecret: config.tuya.apiSecret,
        version: config.tuya.version
      });

      // Initialize Zigbee service
      this.zigbeeService = new ZigbeeService();

      // Initialize Python service
      this.pythonService = new PythonService({
        ...config.python,
        logger: this.logger,
        homey: this.homey
      });

      // Initialize device manager
      this.deviceManager = new DeviceManager({
        homey: this.homey,
        logger: this.logger,
        pythonService: this.pythonService,
        tuyaApi: this.tuyaApi,
        zigbeeService: this.zigbeeService
      });

      this.logger.info('Services initialized');

    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw new AppError(
        'Failed to initialize services',
        500,
        'SERVICE_INIT_ERROR',
        { error }
      );
    }
  }

  /**
   * Register event listeners
   */
  registerEventListeners() {
    // Handle device events
    this.zigbeeService.on('device:discovered', (device) => {
      this.logger.info(`New device discovered: ${device.name} (${device.id})`);
      this.emit('device:discovered', device);
    });

    this.zigbeeService.on('device:updated', (device) => {
      this.logger.debug(`Device updated: ${device.name} (${device.id})`);
      this.emit('device:updated', device);
    });

    this.zigbeeService.on('device:online', (device) => {
      this.logger.info(`Device online: ${device.name} (${device.id})`);
      this.emit('device:online', device);
    });

    this.zigbeeService.on('device:offline', (device) => {
      this.logger.warn(`Device offline: ${device.name} (${device.id})`);
      this.emit('device:offline', device);
    });

    // Handle pairing events
    this.zigbeeService.on('pairing:started', (data) => {
      this.logger.info(`Pairing mode started on gateway ${data.gatewayId} for ${data.duration}s`);
      this.emit('pairing:started', data);
    });

    this.zigbeeService.on('pairing:stopped', (data) => {
      this.logger.info(`Pairing mode stopped on gateway ${data.gatewayId}`);
      this.emit('pairing:stopped', data);
    });

    // Handle Homey events
    this.homey
      .on('unload', () => this.onUninit())
      .on('cpuwarn', () => this.logger.warn('CPU usage high!'))
      .on('memwarn', () => this.logger.warn('Memory usage high!'));

    this.logger.info('Event listeners registered');
  }

  /**
   * Start all services
   */
  async startServices() {
    try {
      // Start Python service
      await this.pythonService.start();

      // Initialize Tuya API
      await this.tuyaApi.init();

      // Initialize Zigbee service
      await this.zigbeeService.init();

      // Initialize device manager
      await this.deviceManager.initialize();

      this.logger.info('All services started');

    } catch (error) {
      this.logger.error('Failed to start services:', error);
      throw new AppError(
        'Failed to start services',
        500,
        'SERVICE_START_ERROR',
        { error }
      );
    }
  }

  /**
   * Clean up resources when app is being unloaded
   * @async
   */
  async onUninit() {
    this.logger.info('🛑 App is being unloaded, cleaning up...');

    try {
      // Stop services in reverse order of initialization
      if (this.deviceManager) {
        await this.deviceManager.cleanup();
      }

      if (this.zigbeeService) {
        await this.zigbeeService.destroy();
      }

      if (this.tuyaApi) {
        await this.tuyaApi.destroy();
      }

      if (this.pythonService) {
        await this.pythonService.stop();
      }

      this.logger.info('✅ Cleanup completed');
      this.emit('app:unloaded');

    } catch (error) {
      this.logger.error('Error during cleanup:', error);
      this.emit('app:error', new AppError(
        'Error during cleanup',
        500,
        'CLEANUP_ERROR',
        { error }
      ));
    }
  }

  /**
   * Get a service by name
   * @param {string} serviceName - Name of the service to get
   * @returns {Object} The requested service
   */
  getService(serviceName) {
    const serviceMap = {
      'tuya': this.tuyaApi,
      'zigbee': this.zigbeeService,
      'python': this.pythonService,
      'deviceManager': this.deviceManager
    };

    const service = serviceMap[serviceName];
    if (!service) {
      throw new AppError(
        `Service '${serviceName}' not found`,
        404,
        'SERVICE_NOT_FOUND'
      );
    }

    return service;
  }

  /**
   * Get application information
   * @returns {Object} App information
   */
  getAppInfo() {
    return {
      name: this.manifest.name,
      version: this.manifest.version,
      description: this.manifest.description,
      sdk: this.manifest.sdk,
      platform: this.manifest.platform,
      permissions: this.manifest.permissions,
      config: {
        debug: config.DEBUG,
        environment: process.env.NODE_ENV || 'production',
        logLevel: config.logLevel
      }
    };
  }
}

module.exports = TuyaZigbeeApp;
