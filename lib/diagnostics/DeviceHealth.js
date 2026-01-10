'use strict';

/**
 * Device Health Monitor
 * Surveille la sante et la connexion des devices
 */

class DeviceHealth {
  constructor(device) {
    this.device = device;
    this.monitorInterval = null;
    this.pingInterval = 300000; // 5 minutes
  }

  /**
   * Demarre le monitoring
   */
  start() {
    this.device.log('Starting device health monitoring');
    this.updateLastSeen();
    this.startMonitoring();
  }

  /**
   * Monitoring periodique
   */
  startMonitoring() {
    // Clear existing interval
    if (this.monitorInterval) {
      this.device.homey.clearInterval(this.monitorInterval);
    }

    // Start new monitoring interval
    this.monitorInterval = this.device.homey.setInterval(async () => {
      await this.checkDeviceHealth();
    }, this.pingInterval);

    this.device.log(`Health monitoring started (interval: ${this.pingInterval / 1000}s)`);
  }

  /**
   * Check device health
   */
  async checkDeviceHealth() {
    const device = this.device;

    try {
      // Try to ping device
      const isReachable = await this.pingDevice();

      if (isReachable) {
        // Device is online
        await this.onDeviceOnline();
      } else {
        // Device is offline
        await this.onDeviceOffline();
      }

      // Update signal strength
      await this.updateSignalStrength();

    } catch (err) {
      device.error('Health check failed:', err);
    }
  }

  /**
   * Ping device
   */
  async pingDevice() {
    const device = this.device;

    try {
      if (!device.zclNode || !device.zclNode.endpoints[1]) {
        return false;
      }

      // Try to read a basic attribute
      const result = await device.zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']);
      return result && result.manufacturerName !== undefined;

    } catch (err) {
      device.log('Ping failed:', err.message);
      return false;
    }
  }

  /**
   * Device came online
   */
  async onDeviceOnline() {
    const device = this.device;
    const wasOffline = device.getCapabilityValue('alarm_offline') || false;

    // Update last seen
    this.updateLastSeen();

    // Clear offline alarm
    if (device.hasCapability('alarm_offline')) {
      await device.setCapabilityValue('alarm_offline', false);
    }

    // Trigger flow if device came back online
    if (wasOffline) {
      device.log('Device came back online');
      
      try {
        const flowCard = device.homey.flow.getDeviceTriggerCard('device_online');
        if (flowCard) {
          await flowCard.trigger(device);
        }
      } catch (err) {
        // Flow card not available yet
      }
    }
  }

  /**
   * Device went offline
   */
  async onDeviceOffline() {
    const device = this.device;
    const wasOnline = !device.getCapabilityValue('alarm_offline') || true;

    // Set offline alarm
    if (device.hasCapability('alarm_offline')) {
      await device.setCapabilityValue('alarm_offline', true);
    }

    // Trigger flow if device just went offline
    if (wasOnline) {
      device.log('Device went offline');
      
      try {
        const flowCard = device.homey.flow.getDeviceTriggerCard('device_offline');
        if (flowCard) {
          await flowCard.trigger(device);
        }
      } catch (err) {
        // Flow card not available yet
      }
    }
  }

  /**
   * Update last seen timestamp
   */
  updateLastSeen() {
    const device = this.device;
    const now = Date.now();

    device.setStoreValue('last_seen_timestamp', now);

    if (device.hasCapability('last_seen')) {
      device.setCapabilityValue('last_seen', new Date(now).toISOString());
    }
  }

  /**
   * Update signal strength
   */
  async updateSignalStrength() {
    const device = this.device;

    try {
      if (!device.hasCapability('measure_rssi')) {
        return;
      }

      if (!device.zclNode || !device.zclNode.endpoints[1]) {
        return;
      }

      // Read RSSI
      const attrs = await device.zclNode.endpoints[1].clusters.basic.readAttributes(['rssi']);
      const rssi = attrs.rssi || -100;

      await device.setCapabilityValue('measure_rssi', parseFloat(rssi));

      // Log weak signal
      if (rssi < -80) {
        device.log(`Weak signal detected: ${rssi} dBm`);
      }

    } catch (err) {
      device.log('Failed to read RSSI:', err.message);
    }
  }

  /**
   * Get device statistics
   */
  getStatistics() {
    const device = this.device;

    return {
      lastSeen: device.getStoreValue('last_seen_timestamp') || 0,
      isOffline: device.getCapabilityValue('alarm_offline') || false,
      signalStrength: device.getCapabilityValue('measure_rssi') || -100,
      uptime: this.getUptime()
    };
  }

  /**
   * Get device uptime (time since last offline)
   */
  getUptime() {
    const device = this.device;
    const lastSeen = device.getStoreValue('last_seen_timestamp') || Date.now();
    return Date.now() - lastSeen;
  }

  /**
   * Arrete le monitoring
   */
  stop() {
    if (this.monitorInterval) {
      this.device.homey.clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.device.log('Health monitoring stopped');
    }
  }
}

module.exports = DeviceHealth;
