'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');
const config = require('./lib/config');
const TuyaAPI = require('./lib/api/tuya');
const DeviceManager = require('./lib/DeviceManager');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const spawn = require('child_process').spawn;

// Import drivers
const TuyaPlugDriver = require('./drivers/tuya_plug/driver');

/**
 * Main application class for Tuya Zigbee integration
 * @extends Homey.App
 */
class TuyaZigbeeApp extends Homey.App {
  
  // Configuration with default values
  static config = {
    PYTHON_SERVICE_PORT: process.env.PYTHON_SERVICE_PORT || 8000,
    PYTHON_SERVICE_PATH: path.join(__dirname, 'python_service'),
    DEBUG: process.env.DEBUG === '1',
    API_KEY: process.env.API_KEY || 'your-secure-api-key'
  };

  /**
   * Initialize the application
   * @async
   */
  async onInit() {
    // Initialize logger
    this.logger = new Log({ 
      homey: this.homey, 
      logLevel: config.logging.level,
      logToConsole: true,
      logToFile: config.logging.file.enabled,
      logFilePath: config.logging.file.path,
      logFileName: config.logging.file.filename,
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
    });
    
    this.logger.info('Initializing Tuya Zigbee App');
    this.logger.debug('App configuration:', config);
    
    try {
      // Initialize API clients
      this.tuyaAPI = new TuyaAPI({
        clientId: this.homey.settings.get('tuyaClientId') || '',
        clientSecret: this.homey.settings.get('tuyaClientSecret') || '',
        region: this.homey.settings.get('tuyaRegion') || 'eu',
        logger: this.logger
      });
      
      // Initialize device manager
      this.deviceManager = new DeviceManager(this);
      
      // Register flow cards
      await this.registerFlowCards();
      
      // Initialize services
      await this.initializeServices();
      
      // Register event listeners
      this.registerEventListeners();
      
      this.logger.info('Tuya Zigbee App has been initialized');
      
      // Check for updates
      if (config.app.checkForUpdates) {
        await this.checkForUpdates();
      }
      
    } catch (err) {
      this.logger.error('Error initializing app:', err);
      throw err; // Let Homey handle the error
    }
  }
  
  /**
   * Register flow cards
   * @private
   * @async
   */
  async registerFlowCards() {
    try {
      // Global flow cards (not tied to specific devices)
      this.flowCards = {
        // Example global trigger
        deviceDiscovered: this.homey.flow.getTriggerCard('device_discovered'),
        
        // Example global action
        syncAllDevices: this.homey.flow.getActionCard('sync_all_devices')
          .registerRunListener(async (args) => {
            await this.deviceManager.syncAllDevices();
            return true;
          })
      };
      
      this.logger.info('Flow cards registered');
    } catch (error) {
      this.logger.error('Error registering flow cards:', error);
      throw error;
    }
  }
  
  /**
   * Register event listeners
   * @private
   */
  registerEventListeners() {
    // Listen for system events
    this.homey
      .on('unload', this.onUnload.bind(this))
      .on('cpuwarn', this.onCpuWarn.bind(this))
      .on('memwarn', this.onMemWarn.bind(this));
      
    // Listen for device events
    this.homey.on('device.added', this.onDeviceAdded.bind(this));
    this.homey.on('device.deleted', this.onDeviceDeleted.bind(this));
  }
  
  /**
   * Initialize services
   * @private
   * @async
   */
  async initializeServices() {
    // Initialize services here
    // Example: this.zigbeeService = new ZigbeeService(this.homey);
  }
  
  /**
   * Handle device pairing
   * @param {Object} session - The pairing session
   * @param {Object} device - The device being paired
   * @param {Object} data - Additional pairing data
   * @async
   */
  async onPair(session) {
    try {
      // Show device selection view
      session.setHandler('list_devices', async () => {
        try {
          // Return list of available devices
          return []; // Replace with actual device discovery
        } catch (err) {
          this.logger.error('Error listing devices:', err);
          throw new Error(this.homey.__('error.device_not_found'));
        }
      });
      
      // Handle device selection
      session.setHandler('list_devices_selection', async (data) => {
        try {
          // Handle device selection
          return true; // Return true if successful
        } catch (err) {
          this.logger.error('Error selecting device:', err);
          throw new Error(this.homey.__('error.pairing_failed'));
        }
      });
    } catch (err) {
      this.logger.error('Pairing error:', err);
      throw err;
    }
  }
  
  /**
   * Initialize drivers
   */
  async initializeDrivers() {
    try {
      // Load all drivers from the drivers directory
      const driversPath = path.join(__dirname, 'drivers');
      const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      this.drivers = new Map();
      
      for (const driverName of driverDirs) {
        try {
          const Driver = require(`./drivers/${driverName}/driver`);
          const driver = new Driver({
            homey: this.homey,
            logger: this.logger,
            deviceManager: this.deviceManager,
            api: this.tuyaAPI,
          });
          
          this.drivers.set(driverName, driver);
          this.logger.info(`Initialized driver: ${driverName}`);
        } catch (error) {
          this.logger.error(`Failed to initialize driver ${driverName}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error initializing drivers:', error);
      throw error;
    }
  }

  /**
   * Start Python service
   */
  async startPythonService() {
    try {
      this.logger.info('Starting Python microservice...');
      
      // Start the Python service
      this.pythonService = spawn('python', [
        '-m', 'uvicorn',
        'main:app',
        '--port', this.config.PYTHON_SERVICE_PORT.toString(),
        '--app-dir', this.config.PYTHON_SERVICE_PATH
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          API_KEY: this.config.API_KEY
        }
      });
      
      // Log output
      this.pythonService.stdout.on('data', (data) => {
        this.logger.debug(`Python service: ${data}`);
      });
      
      this.pythonService.stderr.on('data', (data) => {
        this.logger.error(`Python service error: ${data}`);
      });
      
      // Verify service is running
      return new Promise((resolve, reject) => {
        const checkService = setInterval(() => {
          if (this.isPythonServiceRunning()) {
            clearInterval(checkService);
            this.logger.info('Python microservice started successfully');
            resolve();
          }
        }, 1000);
        
        // Timeout for service startup
        setTimeout(() => {
          clearInterval(checkService);
          if (!this.isPythonServiceRunning()) {
            reject(new Error('Python service failed to start within timeout period'));
          }
        }, 30000);
      });
    } catch (error) {
      this.logger.error('Failed to start Python service:', error);
      throw error;
    }
  }
  
  /**
   * Check if Python service is running
   * @returns {boolean} True if service is running
   * @private
   */
  isPythonServiceRunning() {
    return this.pythonService && !this.pythonService.killed && this.pythonService.exitCode === null;
  }
  
  /**
   * Stop the Python microservice
   * @async
   * @private
   */
  async stopPythonService() {
    if (!this.pythonService) return;
    
    return new Promise((resolve) => {
      this.logger.info('Stopping Python microservice...');
      
      // Try graceful shutdown first
      if (this.pythonService.kill('SIGTERM')) {
        // Give it some time to shut down gracefully
        const timeout = setTimeout(() => {
          if (this.pythonService && !this.pythonService.killed) {
            this.logger.warn('Forcing Python service to stop...');
            this.pythonService.kill('SIGKILL');
          }
          resolve();
        }, 5000);
        
        this.pythonService.once('exit', () => {
          clearTimeout(timeout);
          this.logger.info('Python microservice stopped');
          resolve();
        });
      } else {
        this.logger.warn('Python service was not running');
        resolve();
      }
    });
  }

  /**
   * Handle device added event
   * @param {Object} device - The added device
   */
  async onDeviceAdded(device) {
    try {
      this.logger.info(`Device added: ${device.name} (${device.id})`);
      
      // Add device to device manager
      await this.deviceManager.addDevice({
        id: device.id,
        name: device.getName(),
        driverId: device.driverId,
        data: device.getData(),
        settings: device.getSettings(),
      });
      
      // Trigger device discovered flow card
      if (this.flowCards && this.flowCards.deviceDiscovered) {
        await this.flowCards.deviceDiscovered.trigger({
          id: device.id,
          name: device.getName(),
          driverId: device.driverId,
        });
      }
    } catch (error) {
      this.logger.error(`Error adding device ${device.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle device deleted event
   * @param {Object} device - The deleted device
   */
  async onDeviceDeleted(device) {
    try {
      this.logger.info(`Device deleted: ${device.name} (${device.id})`);
      
      // Remove device from device manager
      await this.deviceManager.removeDevice(device.id);
    } catch (error) {
      this.logger.error(`Error removing device ${device.id}:`, error);
      throw error;
    }
  }

  /**
   * onUninit is called when the app is shutting down
   */
  async onUninit() {
    try {
      this.logger.info('Shutting down Tuya Zigbee app...');
      
      // Clean up device manager
      if (this.deviceManager) {
        await this.deviceManager.cleanup();
      }
      
      // Disconnect from Tuya API
      if (this.tuyaAPI) {
        await this.tuyaAPI.disconnect();
      }
      
      // Clear any intervals or timeouts
      if (this.intervals) {
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
      }
      
      this.logger.info('Tuya Zigbee app has been shut down');
    } catch (error) {
      this.logger.error('Error during app shutdown:', error);
      throw error;
    }
  }

  /**
   * Handle CPU warning
   */
  onCpuWarn() {      
    this.logger.warn('CPU usage warning: App is using too much CPU');
  }

  /**
   * Handle memory warning
   */
  onMemoryWarn() {   
    this.logger.warn('Memory usage warning: App is using too much memory');
  }
  
  /**
   * Check for updates
   * @async
   */
  async checkForUpdates() {
    try {
      this.logger.debug('Checking for updates...');
      
      // In a real implementation, this would check for updates from a repository
      // For now, we'll just log that we're checking
      this.logger.info('Update check completed');
      
    } catch (error) {
      this.logger.error('Error checking for updates:', error);
    }
  }
  
  /**
   * Get Tuya API instance
   * @returns {TuyaAPI} Tuya API instance
   */
  getTuyaAPI() {     
    return this.tuyaAPI;
  }
  
  /**
   * Get device manager instance
   * @returns {DeviceManager} Device manager instance
   */
  getDeviceManager() {
    return this.deviceManager;
  }
}

class DeviceManager {
  constructor(app) {
    this.app = app;
    this.devices = new Map();
    this.logger = app.logger;
  }

  /**
   * Add a new device
   * @param {Object} deviceData - Device data
   */
  addDevice(deviceData) {
    try {
      if (!deviceData || !deviceData.id) {
        throw new Error('Invalid device data: missing required fields');
      }

      this.devices.set(deviceData.id, deviceData);
      this.logger.debug(`Device added: ${deviceData.id}`);
    } catch (error) {
      this.logger.error('Failed to add device:', error);
      throw error;
    }
  }

  /**
   * Remove a device
   * @param {string} deviceId - Device ID
   */
  removeDevice(deviceId) {
    try {
      if (this.devices.has(deviceId)) {
        this.devices.delete(deviceId);
        this.logger.debug(`Device removed: ${deviceId}`);
      } else {
        this.logger.warn(`Device not found: ${deviceId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update device data
   * @param {string} deviceId - Device ID
   * @param {Object} data - Updated device data
   */
  updateDevice(deviceId, data) {
    try {
      if (this.devices.has(deviceId)) {
        const updatedDevice = { ...this.devices.get(deviceId), ...data, updatedAt: new Date() };
        this.devices.set(deviceId, updatedDevice);
        this.logger.debug(`Device updated: ${deviceId}`);
        return updatedDevice;
      } else {
        const error = new Error(`Device not found: ${deviceId}`);
        this.logger.warn(error.message);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to update device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device by ID
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Device data or null if not found
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get all devices
   * @returns {Array} List of devices
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Clean up device manager resources
   * @async
   */
  async cleanup() {
    this.logger.info('Cleaning up device manager...');
    // Add any necessary cleanup for devices
    this.devices.clear();
  }
}

module.exports = TuyaZigbeeApp;