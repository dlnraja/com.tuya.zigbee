const Homey = require('homey');
const { Log } = require('homey-log');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Promisify fs methods
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

/**
 * Main application class for Tuya Zigbee integration
 * @extends Homey.App
 */
class TuyaZigbeeApp extends Homey.App {
  
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
        
        // Handle Python service exit
        this.pythonService.on('close', (code, signal) => {
          if (code !== null) {
            this.logger.warn(`Python service exited with code ${code}`);
            if (code !== 0) {
              this.logger.error('Python service encountered an error and stopped');
              // Attempt to restart the service after a delay
              setTimeout(() => this.startPythonService(), 5000);
            }
          } else if (signal) {
            this.logger.info(`Python service terminated by signal: ${signal}`);
          }
        });
        
        // Handle process errors
        this.pythonService.on('error', (error) => {
          this.logger.error('Failed to start Python service:', error);
          reject(error);
        });
        
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
        
      } catch (error) {
        this.logger.error('Failed to start Python service:', error);
        reject(error);
      }
        
        this.pythonService.on('close', (code) => {
          this.log(`Python service exited with code ${code}`);
        });
        
        // Give the service time to start
        setTimeout(resolve, 3000);
      });
    });
  }
  
  async initializeCore() {
    try {
      // Initialize device manager
      this.deviceManager = new DeviceManager(this);
      
      // Register flow cards
      this.registerFlowCards();
      
      this.log('🤖 Core modules initialized');
    } catch (error) {
      this.error('Failed to initialize core modules:', error);
      throw error;
    }
  }
  
  initializeDiscovery() {
    // Register discovery strategy
    this.homey.discovery.registerStrategy('tuya_zigbee', {
      discover: async () => {
        try {
          const response = await this.callPythonService('POST', '/discover', {
            timeout: 30,
            scan_type: 'active'
          });
          return response.devices || [];
        } catch (error) {
          this.error('Discovery failed:', error);
          return [];
        }
      }
    });
  }
  
  async callPythonService(method, endpoint, data = null) {
    const url = `http://localhost:${this.PYTHON_SERVICE_PORT}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.API_KEY
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${error}`);
      }
      
      return await response.json();
    } catch (error) {
      this.error(`Failed to call Python service (${endpoint}):`, error);
      throw error;
    }
  }
  
  registerFlowCards() {
    // Action cards
    this.homey.flow.getActionCard('send_command')
      .registerRunListener(async (args) => {
        try {
          await this.callPythonService('POST', '/command', {
            device_id: args.device.id,
            command: args.command,
            params: args.params
          });
          return true;
        } catch (error) {
          this.error('Flow action failed:', error);
          throw new Error(this.homey.__('errors.command_failed'));
        }
      });
      
    // Condition cards
    this.homey.flow.getConditionCard('device_online')
      .registerRunListener(async (args) => {
        try {
          const status = await this.callPythonService('GET', `/device/${args.device.id}/status`);
          return status.online === true;
        } catch (error) {
          this.error('Flow condition check failed:', error);
          return false;
        }
      });
  }
  
  // Cleanup on app unload
  async onUninit() {
    if (this.pythonService) {
    }
  });

  // Handle process errors
  this.pythonService.on('error', (error) => {
    this.logger.error('Failed to start Python service:', error);
    reject(error);
  });

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