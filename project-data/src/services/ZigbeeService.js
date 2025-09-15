#!/usr/bin/env node
'use strict';

const EventEmitter = require('events');
const logger = require('@utils/logger');
const { AppError } = require('@utils/errorHandler');
const config = require('@config');
const tuyaApiService = require('./TuyaApiService');

/**
 * Service for managing Zigbee devices and their communication
 */
class ZigbeeService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.devices = new Map(); // Map<deviceId, deviceInfo>
    this.gateways = new Map(); // Map<gatewayId, gatewayInfo>
    this.logger = logger.child({ service: 'ZigbeeService' });
    
    // Bind methods
    this.init = this.init.bind(this);
    this.discoverDevices = this.discoverDevices.bind(this);
    this.pairDevice = this.pairDevice.bind(this);
    this.removeDevice = this.removeDevice.bind(this);
    this.sendCommand = this.sendCommand.bind(this);
    this.getDevice = this.getDevice.bind(this);
    this.getDevices = this.getDevices.bind(this);
    this.getGateway = this.getGateway.bind(this);
    this.getGateways = this.getGateways.bind(this);
    this._handleDeviceEvent = this._handleDeviceEvent.bind(this);
  }

  /**
   * Initialize the Zigbee service
   */
  async init() {
    if (this.initialized) {
      return this;
    }

    try {
      this.logger.info('Initializing Zigbee service...');
      
      // Initialize Tuya API service if needed
      await tuyaApiService.init();
      
      // Discover gateways and devices
      await this._discoverGateways();
      
      // Set up periodic discovery
      this._setupPeriodicDiscovery();
      
      this.initialized = true;
      this.logger.info('Zigbee service initialized');
      
      return this;
    } catch (error) {
      this.logger.error('Failed to initialize Zigbee service:', error);
      throw new AppError(
        'Failed to initialize Zigbee service',
        500,
        'SERVICE_INIT_ERROR',
        { error }
      );
    }
  }

  /**
   * Set up periodic device discovery
   */
  _setupPeriodicDiscovery() {
    // Clear any existing interval
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    // Run discovery every 5 minutes
    const discoveryInterval = config.zigbee?.discoveryInterval || 5 * 60 * 1000;
    this.discoveryInterval = setInterval(() => {
      this.discoverDevices().catch(error => {
        this.logger.error('Periodic device discovery failed:', error);
      });
    }, discoveryInterval);
    
    // Initial discovery
    this.discoverDevices().catch(error => {
      this.logger.error('Initial device discovery failed:', error);
    });
  }

  /**
   * Discover Zigbee gateways
   */
  async _discoverGateways() {
    try {
      this.logger.debug('Discovering Zigbee gateways...');
      
      // Get list of gateways from Tuya API
      const response = await tuyaApiService.get(`/v1.0/iot-03/gateways`);
      
      // Update gateways map
      this.gateways.clear();
      response.result.forEach(gateway => {
        this.gateways.set(gateway.gateway_id, {
          id: gateway.gateway_id,
          name: gateway.name,
          model: gateway.model,
          ip: gateway.ip,
          online: gateway.online,
          activeTime: gateway.active_time,
          firmwareVersion: gateway.firmware_version,
          zigbeeChannel: gateway.zigbee_channel,
          networkId: gateway.network_id,
          lastSeen: new Date(),
        });
      });
      
      this.logger.info(`Discovered ${this.gateways.size} Zigbee gateways`);
      this.emit('gateways:updated', Array.from(this.gateways.values()));
      
      return Array.from(this.gateways.values());
    } catch (error) {
      this.logger.error('Failed to discover Zigbee gateways:', error);
      throw new AppError(
        'Failed to discover Zigbee gateways',
        error.status || 500,
        'GATEWAY_DISCOVERY_ERROR',
        { error }
      );
    }
  }

  /**
   * Discover Zigbee devices
   * @param {Object} options - Discovery options
   * @param {string} [options.gatewayId] - Filter devices by gateway ID
   * @param {boolean} [options.force] - Force rediscovery
   * @returns {Promise<Array>} List of discovered devices
   */
  async discoverDevices(options = {}) {
    try {
      const { gatewayId, force = false } = options;
      
      // If we already have devices and not forcing rediscovery, return cached devices
      if (this.devices.size > 0 && !force) {
        let devices = Array.from(this.devices.values());
        
        // Filter by gateway if specified
        if (gatewayId) {
          devices = devices.filter(device => device.gatewayId === gatewayId);
        }
        
        return devices;
      }
      
      this.logger.debug('Discovering Zigbee devices...', { gatewayId });
      
      // Get list of devices from Tuya API
      const path = gatewayId 
        ? `/v1.0/iot-03/gateways/${gatewayId}/devices`
        : '/v1.0/iot-03/devices';
      
      const response = await tuyaApiService.get(path);
      
      // Update devices map
      const newDevices = [];
      response.result.forEach(device => {
        const deviceInfo = this._mapDeviceInfo(device);
        this.devices.set(deviceInfo.id, deviceInfo);
        
        // Check if this is a new device
        if (!deviceInfo.lastSeen) {
          newDevices.push(deviceInfo);
          this.emit('device:discovered', deviceInfo);
        }
      });
      
      this.logger.info(`Discovered ${this.devices.size} Zigbee devices`);
      
      if (newDevices.length > 0) {
        this.logger.info(`Found ${newDevices.length} new devices`);
        this.emit('devices:discovered', newDevices);
      }
      
      this.emit('devices:updated', Array.from(this.devices.values()));
      
      return Array.from(this.devices.values());
    } catch (error) {
      this.logger.error('Failed to discover Zigbee devices:', error);
      throw new AppError(
        'Failed to discover Zigbee devices',
        error.status || 500,
        'DEVICE_DISCOVERY_ERROR',
        { error }
      );
    }
  }

  /**
   * Map Tuya device info to our format
   * @private
   */
  _mapDeviceInfo(device) {
    const existingDevice = this.devices.get(device.id) || {};
    
    return {
      id: device.id,
      name: device.name,
      model: device.model,
      category: device.category,
      productId: device.product_id,
      productName: device.product_name,
      gatewayId: device.gateway_id,
      online: device.online,
      ip: device.ip,
      lat: device.lat,
      lon: device.lon,
      createTime: device.create_time,
      updateTime: device.update_time,
      activeTime: device.active_time,
      firmwareVersion: device.firmware_version,
      zigbeeNodeId: device.node_id,
      zigbeeIeee: device.zigbee_ieee,
      zigbeeChannel: device.zigbee_channel,
      ...existingDevice,
      lastSeen: new Date(),
    };
  }

  /**
   * Put a device in pairing mode
   * @param {string} gatewayId - Gateway ID
   * @param {number} [duration=60] - Pairing duration in seconds (default: 60)
   * @returns {Promise<boolean>} True if pairing mode was enabled
   */
  async startPairing(gatewayId, duration = 60) {
    try {
      if (!gatewayId) {
        throw new Error('Gateway ID is required');
      }
      
      this.logger.info(`Enabling pairing mode on gateway ${gatewayId} for ${duration} seconds`);
      
      await tuyaApiService.post(
        `/v1.0/iot-03/gateways/${gatewayId}/pairing`,
        { pair_duration: duration }
      );
      
      // Set a timer to automatically stop pairing mode
      if (this.pairingTimeout) {
        clearTimeout(this.pairingTimeout);
      }
      
      this.pairingTimeout = setTimeout(() => {
        this.stopPairing(gatewayId).catch(error => {
          this.logger.error('Failed to stop pairing mode:', error);
        });
      }, (duration - 5) * 1000); // Stop 5 seconds before the end
      
      this.isPairing = true;
      this.emit('pairing:started', { gatewayId, duration });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to enable pairing mode:', error);
      throw new AppError(
        'Failed to enable pairing mode',
        error.status || 500,
        'PAIRING_ERROR',
        { gatewayId, error }
      );
    }
  }

  /**
   * Stop pairing mode on a gateway
   * @param {string} gatewayId - Gateway ID
   * @returns {Promise<boolean>} True if pairing mode was disabled
   */
  async stopPairing(gatewayId) {
    try {
      if (!gatewayId) {
        throw new Error('Gateway ID is required');
      }
      
      this.logger.info(`Disabling pairing mode on gateway ${gatewayId}`);
      
      await tuyaApiService.delete(
        `/v1.0/iot-03/gateways/${gatewayId}/pairing`
      );
      
      // Clear the pairing timeout
      if (this.pairingTimeout) {
        clearTimeout(this.pairingTimeout);
        this.pairingTimeout = null;
      }
      
      this.isPairing = false;
      this.emit('pairing:stopped', { gatewayId });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to disable pairing mode:', error);
      throw new AppError(
        'Failed to disable pairing mode',
        error.status || 500,
        'PAIRING_ERROR',
        { gatewayId, error }
      );
    }
  }

  /**
   * Pair a new device
   * @param {string} gatewayId - Gateway ID
   * @param {Object} options - Pairing options
   * @param {number} [options.timeout=120] - Pairing timeout in seconds (default: 120)
   * @returns {Promise<Object>} Paired device info
   */
  async pairDevice(gatewayId, options = {}) {
    const { timeout = 120 } = options;
    
    try {
      if (!gatewayId) {
        throw new Error('Gateway ID is required');
      }
      
      this.logger.info(`Starting device pairing on gateway ${gatewayId} (timeout: ${timeout}s)`);
      
      // Start pairing mode
      await this.startPairing(gatewayId, timeout);
      
      // Wait for new device to be discovered
      const newDevice = await new Promise((resolve, reject) => {
        const pairingTimeout = setTimeout(() => {
          this.removeListener('device:discovered', onDeviceDiscovered);
          reject(new Error('Pairing timed out. No new devices found.'));
        }, timeout * 1000);
        
        const onDeviceDiscovered = (device) => {
          if (device.gatewayId === gatewayId) {
            clearTimeout(pairingTimeout);
            this.removeListener('device:discovered', onDeviceDiscovered);
            resolve(device);
          }
        };
        
        this.on('device:discovered', onDeviceDiscovered);
        
        // Force a device discovery
        this.discoverDevices({ gatewayId, force: true }).catch(error => {
          this.logger.error('Error during device discovery:', error);
        });
      });
      
      // Stop pairing mode
      await this.stopPairing(gatewayId);
      
      this.logger.info(`Successfully paired device: ${newDevice.name} (${newDevice.id})`);
      
      return newDevice;
      
    } catch (error) {
      // Make sure to stop pairing mode on error
      if (this.isPairing) {
        this.stopPairing(gatewayId).catch(err => {
          this.logger.error('Error stopping pairing mode after error:', err);
        });
      }
      
      this.logger.error('Device pairing failed:', error);
      throw new AppError(
        `Device pairing failed: ${error.message}`,
        error.status || 500,
        'PAIRING_ERROR',
        { gatewayId, error }
      );
    }
  }

  /**
   * Remove a device
   * @param {string} deviceId - Device ID
   * @returns {Promise<boolean>} True if device was removed
   */
  async removeDevice(deviceId) {
    try {
      const device = this.getDevice(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }
      
      this.logger.info(`Removing device: ${device.name} (${device.id})`);
      
      // Remove device from Tuya cloud
      await tuyaApiService.delete(`/v1.0/iot-03/devices/${deviceId}`);
      
      // Remove from local cache
      this.devices.delete(deviceId);
      
      this.emit('device:removed', deviceId);
      this.emit('devices:updated', Array.from(this.devices.values()));
      
      return true;
      
    } catch (error) {
      this.logger.error('Failed to remove device:', error);
      throw new AppError(
        'Failed to remove device',
        error.status || 500,
        'DEVICE_REMOVAL_ERROR',
        { deviceId, error }
      );
    }
  }

  /**
   * Send a command to a device
   * @param {string} deviceId - Device ID
   * @param {string} command - Command to send
   * @param {*} [value] - Command value
   * @returns {Promise<Object>} Command response
   */
  async sendCommand(deviceId, command, value) {
    try {
      const device = this.getDevice(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }
      
      this.logger.debug(`Sending command to device ${deviceId}:`, { command, value });
      
      // Format the command based on device type
      let commands = [];
      
      // This is a simplified example - you would need to map commands to the specific
      // Tuya device protocol based on the device category and capabilities
      switch (command) {
        case 'turnOn':
          commands.push({ code: 'switch_led', value: true });
          break;
        case 'turnOff':
          commands.push({ code: 'switch_led', value: false });
          break;
        case 'setBrightness':
          commands.push({ code: 'bright_value', value });
          break;
        case 'setColor':
          commands.push({ code: 'colour_data', value: JSON.stringify(value) });
          break;
        case 'setTemperature':
          commands.push({ code: 'temp_value', value });
          break;
        default:
          // For custom commands, assume the value is already formatted correctly
          commands = Array.isArray(value) ? value : [{ code: command, value }];
      }
      
      // Send the command to the device
      const response = await tuyaApiService.post(
        `/v1.0/iot-03/devices/${deviceId}/commands`,
        { commands }
      );
      
      // Update device state in cache
      if (response.success && response.result) {
        const updatedDevice = { ...device };
        
        // Update device state based on response
        response.result.forEach(cmd => {
          if (cmd.code && cmd.value !== undefined) {
            updatedDevice[cmd.code] = cmd.value;
          }
        });
        
        this.devices.set(deviceId, updatedDevice);
        this.emit('device:updated', updatedDevice);
        this.emit('devices:updated', Array.from(this.devices.values()));
      }
      
      return response;
      
    } catch (error) {
      this.logger.error('Failed to send command to device:', {
        deviceId,
        command,
        value,
        error: error.message,
      });
      
      throw new AppError(
        `Failed to send command to device: ${error.message}`,
        error.status || 500,
        'DEVICE_COMMAND_ERROR',
        { deviceId, command, value, error }
      );
    }
  }

  /**
   * Get a device by ID
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Device info or null if not found
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get all devices
   * @param {Object} [filter] - Filter options
   * @param {string} [filter.gatewayId] - Filter by gateway ID
   * @param {string} [filter.category] - Filter by device category
   * @param {boolean} [filter.online] - Filter by online status
   * @returns {Array} List of devices
   */
  getDevices(filter = {}) {
    let devices = Array.from(this.devices.values());
    
    if (filter.gatewayId) {
      devices = devices.filter(device => device.gatewayId === filter.gatewayId);
    }
    
    if (filter.category) {
      devices = devices.filter(device => device.category === filter.category);
    }
    
    if (filter.online !== undefined) {
      devices = devices.filter(device => device.online === filter.online);
    }
    
    return devices;
  }

  /**
   * Get a gateway by ID
   * @param {string} gatewayId - Gateway ID
   * @returns {Object|null} Gateway info or null if not found
   */
  getGateway(gatewayId) {
    return this.gateways.get(gatewayId) || null;
  }

  /**
   * Get all gateways
   * @param {Object} [filter] - Filter options
   * @param {boolean} [filter.online] - Filter by online status
   * @returns {Array} List of gateways
   */
  getGateways(filter = {}) {
    let gateways = Array.from(this.gateways.values());
    
    if (filter.online !== undefined) {
      gateways = gateways.filter(gateway => gateway.online === filter.online);
    }
    
    return gateways;
  }

  /**
   * Handle device events
   * @private
   */
  _handleDeviceEvent(event) {
    try {
      const { bizCode, bizData, devId } = event;
      
      if (!devId) {
        this.logger.warn('Received device event without device ID:', event);
        return;
      }
      
      const device = this.getDevice(devId);
      if (!device) {
        this.logger.warn(`Received event for unknown device: ${devId}`);
        return;
      }
      
      this.logger.debug(`Device event: ${bizCode}`, { deviceId: devId, data: bizData });
      
      // Update device state
      const updatedDevice = { ...device };
      
      // Handle different event types
      switch (bizCode) {
        case 'online':
          updatedDevice.online = true;
          updatedDevice.lastSeen = new Date();
          this.emit('device:online', updatedDevice);
          break;
          
        case 'offline':
          updatedDevice.online = false;
          updatedDevice.lastSeen = new Date();
          this.emit('device:offline', updatedDevice);
          break;
          
        case 'nameUpdate':
          updatedDevice.name = bizData.name;
          this.emit('device:renamed', updatedDevice);
          break;
          
        case 'dpRefresh':
          // Update device state with new data points
          if (bizData && Array.isArray(bizData.dps)) {
            bizData.dps.forEach(dp => {
              if (dp.code !== undefined) {
                updatedDevice[dp.code] = dp.value;
              }
            });
            this.emit('device:stateUpdated', updatedDevice);
          }
          break;
          
        default:
          this.logger.debug(`Unhandled device event: ${bizCode}`, { deviceId: devId, data: bizData });
      }
      
      // Update device in cache
      this.devices.set(devId, updatedDevice);
      this.emit('device:updated', updatedDevice);
      
    } catch (error) {
      this.logger.error('Error handling device event:', error, { event });
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    try {
      // Clear intervals
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }
      
      if (this.pairingTimeout) {
        clearTimeout(this.pairingTimeout);
        this.pairingTimeout = null;
      }
      
      // Clear caches
      this.devices.clear();
      this.gateways.clear();
      
      // Remove all event listeners
      this.removeAllListeners();
      
      this.initialized = false;
      this.logger.info('Zigbee service destroyed');
      
    } catch (error) {
      this.logger.error('Error destroying Zigbee service:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const zigbeeService = new ZigbeeService();

module.exports = zigbeeService;
