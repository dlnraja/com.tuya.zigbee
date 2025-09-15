#!/usr/bin/env node
'use strict';

'use strict';

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Enhanced function/class
 */
class DeviceManager extends EventEmitter {
  constructor(app) {
    super();
    this.app = app;
    this.logger = app.logger;
    this.devices = new Map();
  }

  async init() {
    this.logger.info('Initializing DeviceManager');
    // Load devices from storage
    const storedDevices = await this.app.homey.settings.get('devices') || [];
    storedDevices.forEach(device => {
      this.devices.set(device.id, device);
    });
    this.logger.info(`Loaded ${this.devices.size} devices from storage`);
  }

  async addDevice(deviceData) {
    const deviceId = deviceData.id || `device_${uuidv4()}`;
    const device = {
      id: deviceId,
      name: deviceData.name || `Tuya Device ${deviceId.substring(0, 8)}`,
      driverId: deviceData.driverId,
      data: deviceData.data || {},
      settings: deviceData.settings || {},
      capabilities: deviceData.capabilities || [],
      capabilitiesOptions: deviceData.capabilitiesOptions || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.devices.set(deviceId, device);
    await this._saveDevices();
    this.emit('deviceAdded', device);
    this.logger.info(`Added device: ${device.name} (${deviceId})`);
    return device;
  }

  async updateDevice(deviceId, updates) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const updatedDevice = {
      ...device,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.devices.set(deviceId, updatedDevice);
    await this._saveDevices();
    this.emit('deviceUpdated', updatedDevice);
    this.logger.info(`Updated device: ${device.name} (${deviceId})`);
    return updatedDevice;
  }

  async removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    this.devices.delete(deviceId);
    await this._saveDevices();
    this.emit('deviceRemoved', device);
    this.logger.info(`Removed device: ${device.name} (${deviceId})`);
    return device;
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  getAllDevices() {
    return Array.from(this.devices.values());
  }

  getDevicesByDriver(driverId) {
    return this.getAllDevices().filter(device => device.driverId === driverId);
  }

  async cleanup() {
    this.logger.info('Cleaning up DeviceManager');
    this.removeAllListeners();
  }

  async _saveDevices() {
    const devices = this.getAllDevices();
    await this.app.homey.settings.set('devices', devices);
  }
}

module.exports = DeviceManager;
