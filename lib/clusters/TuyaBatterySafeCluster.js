'use strict';

/**
 * TuyaBatterySafeCluster - Anti-drain battery cluster pattern
 *
 * Prevents battery drain on Tuya battery-powered Zigbee devices by overriding
 * bind() and configureReporting() to no-ops. This matches ZHA's
 * TuyaNoBindPowerConfigurationCluster pattern.
 *
 * Problem: When the coordinator binds to the PowerConfiguration cluster and
 * configures attribute reporting on battery-powered Tuya devices, the device
 * wakes up to respond to these requests, draining the battery rapidly.
 *
 * Solution: Intercept bind() and configureReporting() calls and return success
 * without actually performing the operation on the device.
 *
 * Usage:
 *   const TuyaBatterySafeCluster = require('../../lib/clusters/TuyaBatterySafeCluster');
 *   // Use as a BoundCluster in cluster definitions
 *
 * @version 1.0.0
 * @since v9.0.40
 */
const { BoundCluster } = require('zigbee-clusters');

class TuyaBatterySafeCluster extends BoundCluster {

  /**
   * Override bind() to no-op for battery devices.
   * Prevents unnecessary radio wake-ups that drain the battery.
   * @returns {Promise<void>}
   */
  async bind() {
    // Intentionally empty - prevents battery drain from bind requests
    return;
  }

  /**
   * Override configureReporting() to no-op for battery devices.
   * Prevents unnecessary radio wake-ups that drain the battery.
   * @returns {Promise<void>}
   */
  async configureReporting() {
    // Intentionally empty - prevents battery drain from reporting configuration
    return;
  }
}

module.exports = TuyaBatterySafeCluster;
