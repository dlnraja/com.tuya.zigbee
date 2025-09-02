'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');
const config = require('./lib/config');
const TuyaAPI = require('./lib/api/tuya');
const DeviceManager = require('./lib/DeviceManager');
const { v4: uuidv4 } = require('uuid');

// Import drivers
const TuyaPlugDriver = require('./drivers/tuya_plug/driver');

/**
 * Main application class for Tuya Zigbee integration
 * @extends Homey.App
 */
class TuyaZigbeeApp extends Homey.App {
  
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
  
  // Configuration with default values
  config = {
    PYTHON_SERVICE_PORT: process.env.PYTHON_SERVICE_PORT || 8000,
    PYTHON_SERVICE_PATH: path.join(__dirname, 'python_service'),
    DEBUG: process.env.DEBUG === '1',
    API_KEY: process.env.API_KEY || 'your-secure-api-key', // In production, use Homey's settings
  };
  
  /**
   * Application initialization
   * @async
   */
  async onInit() {
    // Initialize logger
    this.logger = new Log({ homey: this.homey, logLevel: this.config.DEBUG ? 'debug' : 'info' });
    this.logger.info('🚀 Universal Tuya Zigbee App initializing...');
    
    try {
      // Load configuration
      await this.loadConfig();
      
      // Initialize Python microservice
      await this.startPythonService();
      
      // Initialize core modules
      await this.initializeCore();
      
      // Initialize device discovery
      this.initializeDiscovery();
      
      // Register event handlers
      this.registerEventHandlers();
      
      this.logger.info('✅ App initialized successfully');
    } catch (error) {
      this.logger.error('❌ App initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Load configuration from file or environment variables
   * @async
   * @private
   */
  async loadConfig() {
    const configPath = path.join(this.homey.configPath, 'config.json');
    
    try {
      // Check if config file exists
      await access(configPath, fs.constants.F_OK);
      const configData = await readFile(configPath, 'utf8');
      this.config = { ...this.config, ...JSON.parse(configData) };
      this.logger.debug('Configuration loaded successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, create with defaults
        await writeFile(configPath, JSON.stringify(this.config, null, 2));
        this.logger.info('Created default configuration file');
      } else {
        this.logger.warn('Failed to load configuration, using defaults:', error);
      }
    }
  }
  
  /**
   * Start the Python microservice
   * @async
   * @private
   */
  async startPythonService() {
    if (!this.config.ENABLE_PYTHON_SERVICE) {
      this.logger.info('Python microservice is disabled in configuration');
      return;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const requirementsPath = path.join(this.config.PYTHON_SERVICE_PATH, 'requirements.txt');
        const servicePath = path.join(this.config.PYTHON_SERVICE_PATH, 'main.py');
        
        // Verify Python service files exist
        if (!fs.existsSync(servicePath)) {
          this.logger.warn('Python service not found at:', servicePath);
          return resolve();
        }
        
        // Install Python dependencies
        this.logger.info('Installing Python dependencies...');
        const pipInstall = spawn(pythonPath, ['-m', 'pip', 'install', '--upgrade', '-r', requirementsPath]);
        
        pipInstall.on('close', (code) => {
          if (code !== 0) {
            this.logger.warn('Python dependencies installation completed with code:', code);
          } else {
            this.logger.info('Python dependencies installed successfully');
          }
          
          // Start the Python service
          this.logger.info('Starting Python microservice...');
          this.pythonService = spawn(pythonPath, ['main.py'], {
            cwd: this.config.PYTHON_SERVICE_PATH,
            env: { 
              ...process.env, 
              PYTHONUNBUFFERED: '1',
              PORT: this.config.PYTHON_SERVICE_PORT,
              API_KEY: this.config.API_KEY,
              DEBUG: this.config.DEBUG ? '1' : '0'
            }
        });
        
        // Log Python service output
        // Handle Python service output
        this.pythonService.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output) {
            this.logger.debug(`[Python Service] ${output}`);
          }
        });
        
        // Handle Python service errors
        this.pythonService.stderr.on('data', (data) => {
          const error = data.toString().trim();
          if (error) {
            this.logger.error(`[Python Service Error] ${error}`);
          }
        });
        
      this.tuyaAPI = new TuyaAPI({
        clientId,
        clientSecret,
        region: region || config.tuya.defaultRegion,
        logger: this.logger,
      });

      // Initialize device manager
      this.deviceManager = new DeviceManager(this);
      await this.deviceManager.init();

      // Initialize drivers
      await this.initializeDrivers();

      // Register flow cards
      await this.registerFlowCards();
      
      // Register event listeners
      this.registerEventListeners();
      
      // Initialize services
      await this.initializeServices();
      
      this.logger.info('Tuya Zigbee app has been initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Tuya Zigbee app:', error);
      throw error; // Rethrow to let Homey handle the error
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
   * Register flow cards
   */
  async registerFlowCards() {
    try {
      // Device discovered trigger
      this.flowCards = {
        deviceDiscovered: this.homey.flow.getDeviceTriggerCard('device_discovered')
          .registerRunListener(async (args, state) => {
            return args.device.id === state.deviceId;
          }),
        
        // Add more flow cards as needed
      };
      
      this.logger.info('Flow cards registered');
    } catch (error) {
      this.logger.error('Failed to register flow cards:', error);
      throw error;
    }
  }

  /**
   * Register event listeners
   */
  registerEventListeners() {
    // Listen for device added events
    this.homey.on('device.added', device => this.onDeviceAdded(device).catch(error => {
      this.logger.error('Error handling device added event:', error);
    }));
    
    // Listen for device deleted events
    this.homey.on('device.deleted', device => this.onDeviceDeleted(device).catch(error => {
      this.logger.error('Error handling device deleted event:', error);
    }));
    
    // Listen for system warnings
    process.on('warning', warning => {
      this.logger.warn('System warning:', warning);
    });
    
    this.logger.info('Event listeners registered');
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    try {
      // Start the Python service if enabled
      if (this.settings.enablePythonService) {
        await this.startPythonService();
      }
      
      this.logger.info('Services initialized');
    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw error;
    }
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
   * Start Python service
   */
  async startPythonService() {
    // Implementation for starting Python service
    // This is a placeholder for future implementation
    this.logger.info('Python service is not yet implemented');
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
  
  // Verify service is running
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

catch (error) {
  this.logger.error('Failed to start Python service:', error);
  reject(error);
}

this.pythonService.on('close', (code) => {
  this.log(`Python service exited with code ${code}`);
});

// Give the service time to start
setTimeout(resolve, 3000);
});

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
 * Initialize core application modules
 * @async
 * @private
 */
async initializeCore() {
  try {
    this.logger.info('Initializing core modules...');

    // Initialize device manager
    this.deviceManager = new DeviceManager(this);

    // Initialize other core modules here
    // this.apiClient = new ApiClient(this.config.API_URL);

    this.logger.info('Core modules initialized');
  } catch (error) {
    this.logger.error('Failed to initialize core modules:', error);
    throw error;
  }
}

/**
 * Initialize device discovery
 * @private
 */
initializeDiscovery() {
  this.logger.info('Initializing device discovery...');

  // Register device discovery
  this.homey.appDiscovery.on('discover', this.handleDeviceDiscovery.bind(this));

  // Start periodic discovery
  this.discoveryInterval = setInterval(
    () => this.startDeviceDiscovery(), 
    this.config.DISCOVERY_INTERVAL || 300000 // Default: 5 minutes
  );

  // Initial discovery
  this.startDeviceDiscovery();
}

/**
 * Start device discovery process
 * @async
 */
async startDeviceDiscovery() {
  try {
    this.logger.debug('Starting device discovery...');
    // Implement device discovery logic here
    // await this.deviceManager.discoverDevices();
  } catch (error) {
    this.logger.error('Device discovery failed:', error);
  }
}

/**
 * Handle discovered device
 * @param {Object} device - Discovered device data
 * @private
 */
async handleDeviceDiscovery(device) {
  try {
    this.logger.debug('Device discovered:', device.id);
    // Process discovered device
    // await this.deviceManager.addDevice(device);
  } catch (error) {
    this.logger.error('Failed to process discovered device:', error);
  }
}

/**
 * Register event handlers
 * @private
 */
registerEventHandlers() {
  // Handle Homey events
  this.homey
    .on('unload', this.onUnload.bind(this))
    .on('unload', () => this.cleanup())
    .on('reboot', () => this.cleanup())
    .on('cpuwarn', () => this.logger.warn('CPU usage is high!'))
    .on('memwarn', () => this.logger.warn('Memory usage is high!'))
    .on('online', () => this.logger.info('Homey is online'))
    .on('offline', () => this.logger.warn('Homey is offline'));
}

/**
 * Clean up resources when app is being unloaded
 * @async
 */
async onUnload() {
  this.logger.info('App is being unloaded, cleaning up...');
  await this.cleanup();
}

/**
 * Clean up resources
 * @async
 */
async cleanup() {
  try {
    // Stop discovery interval
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    // Stop Python service
    await this.stopPythonService();

    // Clean up other resources
    // await this.deviceManager.cleanup();

    this.logger.info('Cleanup completed');
  } catch (error) {
    this.logger.error('Error during cleanup:', error);
  }
}

// Device Manager
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