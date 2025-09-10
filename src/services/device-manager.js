#!/usr/bin/env node
'use strict';

'use strict';

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Device Manager Service
 * Manages all connected Tuya Zigbee devices
 */
class DeviceManager extends EventEmitter {
  /**
   * Create a new DeviceManager instance
   * @param {Object} options - Configuration options
   * @param {Object} options.homey - Homey instance
   * @param {Object} options.logger - Logger instance
   * @param {Object} [options.pythonService] - Python service instance
   */
  constructor({ homey, logger, pythonService }) {
    super();
    this.homey = homey;
    this.logger = logger || console;
    this.pythonService = pythonService;

    // Device storage
    this.devices = new Map();
    this.discoveryInterval = null;
    this.isInitialized = false;

    // Bind methods
    this._handleDeviceEvent = this._handleDeviceEvent.bind(this);
  }

  /**
   * Initialize the device manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('DeviceManager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing DeviceManager...');

      // Load existing devices from Homey
      await this._loadDevices();

      // Start device discovery
      this._startDiscovery();

      // Register event listeners
      this._registerEventListeners();

      this.isInitialized = true;
      this.logger.info('DeviceManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize DeviceManager:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.logger.info('Cleaning up DeviceManager...');

    // Stop discovery
    this._stopDiscovery();

    // Remove event listeners
    this._unregisterEventListeners();

    // Clear devices
    this.devices.clear();

    this.isInitialized = false;
    this.logger.info('DeviceManager cleanup completed');
  }

  /**
   * Get a device by ID
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Device instance or null if not found
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get all devices
   * @returns {Array} Array of device objects
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Add a new device
   * @param {Object} deviceData - Device data
   * @returns {Object} The added device
   */
  addDevice(deviceData) {
    try {
      if (!deviceData || typeof deviceData !== 'object') {
        throw new Error('Invalid device data');
      }

      // Generate a unique ID if not provided
      const deviceId = deviceData.id || `device-${uuidv4()}`;

      // Create device object
      const device = {
        id: deviceId,
        name: deviceData.name || `Tuya Device ${deviceId.substring(0, 6)}`,
        type: deviceData.type || 'generic',
        model: deviceData.model || 'unknown',
        manufacturer: deviceData.manufacturer || 'Tuya',
        capabilities: deviceData.capabilities || [],
        settings: deviceData.settings || {},
        state: {
          online: false,
          ...deviceData.state
        },
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store device
      this.devices.set(deviceId, device);
      this.logger.info(`Added device: ${deviceId} (${device.name})`);

      // Emit event
      this.emit('device:added', device);

      return device;

    } catch (error) {
      this.logger.error('Failed to add device:', error);
      throw error;
    }
  }

  /**
   * Remove a device
   * @param {string} deviceId - Device ID to remove
   * @returns {boolean} True if device was removed, false if not found
   */
  removeDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      this.logger.warn(`Device not found: ${deviceId}`);
      return false;
    }

    const device = this.devices.get(deviceId);
    this.devices.delete(deviceId);

    this.logger.info(`Removed device: ${deviceId} (${device.name})`);

    // Emit event
    this.emit('device:removed', device);

    return true;
  }

  /**
   * Update device data
   * @param {string} deviceId - Device ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated device or null if not found
   */
  updateDevice(deviceId, updates) {
    if (!this.devices.has(deviceId)) {
      this.logger.warn(`Cannot update: device not found: ${deviceId}`);
      return null;
    }

    const device = this.devices.get(deviceId);
    const updatedDevice = {
      ...device,
      ...updates,
      updatedAt: new Date()
    };

    this.devices.set(deviceId, updatedDevice);

    // Emit event
    this.emit('device:updated', updatedDevice, device);

    return updatedDevice;
  }

  /**
   * Send a command to a device
   * @param {string} deviceId - Target device ID
   * @param {string} command - Command to send
   * @param {*} [data] - Optional command data
   * @returns {Promise<*>} Command response
   */
  async sendCommand(deviceId, command, data) {
    const device = this.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    try {
      this.logger.debug(`Sending command to ${deviceId}: ${command}`, data);

      // TODO: Implement actual device communication
      // This is a placeholder for the actual implementation
      const result = await this._sendDeviceCommand(device, command, data);

      // Update last seen
      this.updateDevice(deviceId, {
        lastSeen: new Date(),
        state: {
          ...device.state,
          online: true
        }
      });

      return result;

    } catch (error) {
      this.logger.error(`Command failed for device ${deviceId}:`, error);

      // Update device status on error
      if (device.state.online) {
        this.updateDevice(deviceId, {
          state: {
            ...device.state,
            online: false,
            lastError: error.message
          }
        });
      }

      throw error;
    }
  }

  // ===== PRIVATE METHODS ===== //

  /**
   * Load devices from Homey
   * @private
   * @returns {Promise<void>}
   */
  async _loadDevices() {
    try {
      this.logger.debug('Loading devices from Homey...');

      // Get all devices from Homey
      const homeyDevices = await this.homey.devices.getDevices();

      // Process each device
      for (const device of Object.values(homeyDevices)) {
        try {
          // Skip non-Tuya devices
          if (!this._isTuyaDevice(device)) {
            continue;
          }

          // Add to our device map
          this.devices.set(device.id, this._mapHomeyDevice(device));

        } catch (error) {
          this.logger.error(`Error loading device ${device.id}:`, error);
        }
      }

      this.logger.info(`Loaded ${this.devices.size} devices from Homey`);

    } catch (error) {
      this.logger.error('Failed to load devices from Homey:', error);
      throw error;
    }
  }

  /**
   * Check if a device is a Tuya device
   * @private
   * @param {Object} device - Device object
   * @returns {boolean}
   */
  _isTuyaDevice(device) {
    // TODO: Implement proper Tuya device detection
    return device && device.driverUri && device.driverUri.startsWith('homey:app:com.tuya');
  }

  /**
   * Map Homey device to our internal format
   * @private
   * @param {Object} homeyDevice - Homey device object
   * @returns {Object} Mapped device
   */
  _mapHomeyDevice(homeyDevice) {
    return {
      id: homeyDevice.id,
      name: homeyDevice.name,
      type: homeyDevice.class,
      model: homeyDevice.data?.model || 'unknown',
      manufacturer: homeyDevice.data?.manufacturer || 'Tuya',
      capabilities: homeyDevice.capabilities || [],
      settings: homeyDevice.settings || {},
      state: {
        online: homeyDevice.available || false,
        ...(homeyDevice.capabilitiesObj || {})
      },
      homeyDevice: homeyDevice,
      lastSeen: new Date(),
      createdAt: homeyDevice.created || new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Start device discovery
   * @private
   */
  _startDiscovery() {
    this._stopDiscovery(); // Clear any existing interval

    // Run discovery immediately
    this._runDiscovery();

    // Then run periodically
    this.discoveryInterval = setInterval(
      () => this._runDiscovery(),
      this.homey.settings.get('discoveryInterval') || 300000 // 5 minutes
    );

    this.logger.info('Device discovery started');
  }

  /**
   * Stop device discovery
   * @private
   */
  _stopDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
      this.logger.debug('Stopped device discovery');
    }
  }

  /**
   * Run device discovery
   * @private
   * @returns {Promise<void>}
   */
  async _runDiscovery() {
    try {
      this.logger.debug('Running device discovery...');

      // TODO: Implement actual device discovery
      // This is a placeholder for the actual implementation
      await this._discoverDevices();

      this.logger.debug('Device discovery completed');

    } catch (error) {
      this.logger.error('Device discovery failed:', error);
    }
  }

  /**
   * Discover new devices
   * @private
   * @returns {Promise<void>}
   */
  async _discoverDevices() {
    // TODO: Implement actual device discovery logic
    // This is a placeholder that simulates discovering devices

    // Example: Use Python service to discover devices
    if (this.pythonService && this.pythonService.isServiceRunning()) {
      try {
        const devices = await this.pythonService.discoverDevices();

        // Process discovered devices
        for (const deviceData of devices) {
          // Check if device already exists
          if (!this.devices.has(deviceData.id)) {
            // Add new device
            this.addDevice(deviceData);
          }
        }

      } catch (error) {
        this.logger.error('Error discovering devices:', error);
      }
    }
  }

  /**
   * Send a command to a device
   * @private
   * @param {Object} device - Device object
   * @param {string} command - Command to send
   * @param {*} [data] - Command data
   * @returns {Promise<*>} Command response
   */
  async _sendDeviceCommand(device, command, data) {
    // TODO: Implement actual device communication
    // This is a placeholder for the actual implementation

    // Example: Use Python service to send commands
    if (this.pythonService && this.pythonService.isServiceRunning()) {
      try {
        return await this.pythonService.sendCommand(device.id, command, data);
      } catch (error) {
        this.logger.error(`Command failed for device ${device.id}:`, error);
        throw error;
      }
    }

    // Fallback to direct device communication if Python service is not available
    return new Promise((resolve) => {
      this.logger.debug(`[MOCK] Sending command to ${device.id}: ${command}`, data);
      setTimeout(() => {
        resolve({ status: 'ok', command, deviceId: device.id });
      }, 100);
    });
  }

  /**
   * Register event listeners
   * @private
   */
  _registerEventListeners() {
    // Homey device events
    this.homey
      .on('device.new', this._handleDeviceEvent('device:new'))
      .on('device.rename', this._handleDeviceEvent('device:renamed'))
      .on('device.delete', this._handleDeviceEvent('device:deleted'));

    // Custom events
    this.on('device:added', (device) => {
      this.logger.info(`Device added: ${device.name} (${device.id})`);
    });

    this.on('device:removed', (device) => {
      this.logger.info(`Device removed: ${device.name} (${device.id})`);
    });

    this.on('device:updated', (newDevice, oldDevice) => {
      this.logger.debug(`Device updated: ${newDevice.name} (${newDevice.id})`);
    });
  }

  /**
   * Unregister event listeners
   * @private
   */
  _unregisterEventListeners() {
    // Remove Homey event listeners
    this.homey
      .removeListener('device.new', this._handleDeviceEvent)
      .removeListener('device.rename', this._handleDeviceEvent)
      .removeListener('device.delete', this._handleDeviceEvent);
  }

  /**
   * Handle device events
   * @private
   * @param {string} event - Event name
   * @returns {Function} Event handler function
   */
  _handleDeviceEvent(event) {
    return (device) => {
      try {
        this.logger.debug(`Device event: ${event}`, { deviceId: device.id });

        switch (event) {
          case 'device:new':
            if (this._isTuyaDevice(device)) {
              this.addDevice(this._mapHomeyDevice(device));
            }
            break;

          case 'device:renamed':
            if (this.devices.has(device.id)) {
              this.updateDevice(device.id, { name: device.name });
            }
            break;

          case 'device:deleted':
            this.removeDevice(device.id);
            break;
        }

      } catch (error) {
        this.logger.error(`Error handling device event ${event}:`, error);
      }
    };
  }
}

module.exports = DeviceManager;
