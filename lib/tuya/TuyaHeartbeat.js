'use strict';

/**
 * Tuya Heartbeat Manager
 * 
 * Inspired by zigbee-herdsman's Tuya cluster implementation.
 * Ensures devices stay online by sending periodic "keep-alive" commands 
 * or responding to Tuya-specific heartbeat DPs.
 */

class TuyaHeartbeat {
  constructor(device) {
    this.device = device;
    this.heartbeatInterval = null;
    this.lastHeartbeat = Date.now();
  }

  /**
   * Start heartbeat monitoring
   * @param {number} intervalMs - Interval in milliseconds (default 1 hour)
   */
  start(intervalMs = 3600000) {
    this.stop();
    
    this.device.log(`Starting Tuya heartbeat (interval: ${intervalMs}ms)`);
    
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, intervalMs);
  }

  /**
   * Stop heartbeat monitoring
   */
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if heartbeat is still valid
   */
  checkHeartbeat() {
    const now = Date.now();
    const diff = now - this.lastHeartbeat;
    
    // If no report for 2x interval, mark as potentially offline or try to ping
    if (diff > (this.heartbeatInterval * 2)) {
      this.device.log('Heartbeat missed, attempting to ping device...');
      this.ping();
    }
  }

  /**
   * Ping the device using a safe Tuya read
   */
  async ping() {
    try {
      if (this.device.zclNode && this.device.zclNode.endpoints[1]) {
        // Read basic cluster to check if device is alive
        await this.device.zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']);
        this.update();
      }
    } catch (err) {
      this.device.error('Ping failed:', err.message);
    }
  }

  /**
   * Update last heartbeat timestamp
   */
  update() {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Handle Tuya-specific heartbeat DP (if any)
   * Some Tuya devices report status on DP 0 or other special DPs
   */
  handleHeartbeatDP(dp, value) {
    this.device.log(`Received Tuya heartbeat DP${dp}: ${value}`);
    this.update();
  }
}

module.exports = TuyaHeartbeat;
