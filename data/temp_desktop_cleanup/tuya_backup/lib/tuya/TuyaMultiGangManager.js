'use strict';

const TuyaDPParser = require('./TuyaDPParser');

/**
 * TuyaMultiGangManager - Complete Multi-Gang Switch Management
 *
 * Based on official Tuya Developer Gateway Connectivity documentation:
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard
 *
 * Supports ALL Tuya Multi-Gang Switch Data Points (DPs):
 * - DP1-4: Switch On/Off (per gang) - Boolean
 * - DP7-10: Countdown timers (per gang) - Value (seconds)
 * - DP14: Power-on behavior (main) - Enum (0=Off, 1=On, 2=Last)
 * - DP15: LED indicator behavior - Enum (0=Off, 1=Status, 2=Inverse)
 * - DP16: Backlight control - Boolean
 * - DP19: Inching/Pulse mode (per gang) - Raw (3×n bytes)
 * - DP29-32: Power-on behavior (per gang) - Enum (same as DP14)
 * - DP209: Weekly schedules - Raw (2+10×n bytes) [FUTURE]
 * - DP210: Random timing - Raw (2+6×n bytes) [FUTURE]
 *
 * Integrates with:
 * - TuyaEF00Manager: DP communication layer
 * - TuyaDPParser: DP encoding/decoding
 * - HybridProtocolManager: Protocol routing
 */

class TuyaMultiGangManager {

  /**
   * Constructor
   * @param {ZigBeeDevice} device - Homey ZigBee device instance
   */
  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);

    // Reference to TuyaEF00Manager if available
    this.tuyaEF00 = device.tuyaEF00Manager || null;

    // Gang count (1-8)
    this.gangCount = this._detectGangCount();

    this.log(`[TUYA-MULTI-GANG] Manager initialized for ${this.gangCount}-gang switch`);
  }

  /**
   * Detect gang count from driver ID
   * @returns {number} Number of gangs (1-8)
   */
  _detectGangCount() {
    const driverId = this.device.driver.id;

    // Extract gang number from driver ID
    const match = driverId.match(/(\d)gang/);
    if (match) {
      return parseInt(match[1]);
    }

    // Check endpoints count
    const endpoints = Object.keys(this.device.zclNode.endpoints || {});
    if (endpoints.length > 1) {
      return endpoints.length - 1; // Exclude endpoint 242
    }

    // Default to 1
    return 1;
  }

  /**
   * DP15: Set LED indicator behavior
   * @param {number} mode - 0=Off, 1=Status, 2=Inverse
   */
  async setLEDBehavior(mode) {
    try {
      if (!this.tuyaEF00) {
        this.log('[TUYA-MULTI-GANG] No Tuya EF00 manager available');
        return false;
      }

      this.log(`[TUYA-MULTI-GANG] Setting LED behavior: ${mode}`);

      // Write to DP15
      await this.tuyaEF00.writeDP(15, mode);

      this.log('[TUYA-MULTI-GANG] ✅ LED behavior set successfully');
      return true;

    } catch (err) {
      this.error('[TUYA-MULTI-GANG] Error setting LED behavior:', err);
      return false;
    }
  }

  /**
   * DP16: Set backlight on/off
   * @param {boolean} enabled - true=On, false=Off
   */
  async setBacklight(enabled) {
    try {
      if (!this.tuyaEF00) {
        this.log('[TUYA-MULTI-GANG] No Tuya EF00 manager available');
        return false;
      }

      this.log(`[TUYA-MULTI-GANG] Setting backlight: ${enabled}`);

      // Write to DP16
      await this.tuyaEF00.writeDP(16, enabled ? 1 : 0);

      this.log('[TUYA-MULTI-GANG] ✅ Backlight set successfully');
      return true;

    } catch (err) {
      this.error('[TUYA-MULTI-GANG] Error setting backlight:', err);
      return false;
    }
  }

  /**
   * DP14: Set main power-on behavior (all gangs)
   * @param {number} mode - 0=Off, 1=On, 2=Last State
   */
  async setMainPowerOnBehavior(mode) {
    try {
      this.log(`[TUYA-MULTI-GANG] Setting main power-on behavior: ${mode}`);

      // Write to startUpOnOff attribute (On/Off cluster)
      const endpoint = this.device.zclNode.endpoints[1];
      if (endpoint && endpoint.clusters.onOff) {
        await endpoint.clusters.onOff.writeAttributes({
          startUpOnOff: mode
        });

        this.log('[TUYA-MULTI-GANG] ✅ Main power-on behavior set successfully');
        return true;
      } else {
        this.log('[TUYA-MULTI-GANG] ⚠️ On/Off cluster not available');
        return false;
      }

    } catch (err) {
      this.error('[TUYA-MULTI-GANG] Error setting main power-on behavior:', err);
      return false;
    }
  }

  /**
   * DP29-32: Set per-gang power-on behavior
   * @param {number} gang - Gang number (1-4)
   * @param {number} mode - 0=Off, 1=On, 2=Last State
   */
  async setGangPowerOnBehavior(gang, mode) {
    try {
      if (gang < 1 || gang > 4) {
        this.error(`[TUYA-MULTI-GANG] Invalid gang number: ${gang}`);
        return false;
      }

      if (!this.tuyaEF00) {
        this.log('[TUYA-MULTI-GANG] No Tuya EF00 manager available');
        return false;
      }

      this.log(`[TUYA-MULTI-GANG] Setting gang ${gang} power-on behavior: ${mode}`);

      // DP29-32 = DP(28 + gang)
      const dp = 28 + gang;
      await this.tuyaEF00.writeDP(dp, mode);

      this.log(`[TUYA-MULTI-GANG] ✅ Gang ${gang} power-on behavior set successfully`);
      return true;

    } catch (err) {
      this.error(`[TUYA-MULTI-GANG] Error setting gang ${gang} power-on behavior:`, err);
      return false;
    }
  }

  /**
   * DP7-10: Set countdown timer for a gang
   * @param {number} gang - Gang number (1-4)
   * @param {number} seconds - Duration in seconds (0-3600)
   */
  async setCountdownTimer(gang, seconds) {
    try {
      if (gang < 1 || gang > this.gangCount) {
        this.error(`[TUYA-MULTI-GANG] Invalid gang number: ${gang}`);
        return false;
      }

      if (seconds < 0 || seconds > 3600) {
        this.error(`[TUYA-MULTI-GANG] Invalid duration: ${seconds}s (max 3600s)`);
        return false;
      }

      this.log(`[TUYA-MULTI-GANG] Setting countdown timer gang ${gang}: ${seconds}s`);

      const endpoint = this.device.zclNode.endpoints[gang];
      if (endpoint && endpoint.clusters.onOff) {
        // Write to On Time (0x4001) and Off Wait Time (0x4002)
        // Both must have the same value!
        await endpoint.clusters.onOff.writeAttributes({
          0x4001: seconds, // On Time
          0x4002: seconds  // Off Wait Time
        });

        this.log(`[TUYA-MULTI-GANG] ✅ Countdown timer gang ${gang} set successfully`);
        return true;
      } else {
        this.log(`[TUYA-MULTI-GANG] ⚠️ Endpoint ${gang} On/Off cluster not available`);
        return false;
      }

    } catch (err) {
      this.error(`[TUYA-MULTI-GANG] Error setting countdown timer gang ${gang}:`, err);
      return false;
    }
  }

  /**
   * DP19: Set inching/pulse mode (all gangs)
   * @param {Array} gangConfigs - Array of {gang, enabled, duration}
   * Example: [{gang: 1, enabled: true, duration: 60}, {gang: 2, enabled: false, duration: 30}]
   */
  async setInchingMode(gangConfigs) {
    try {
      if (!this.tuyaEF00) {
        this.log('[TUYA-MULTI-GANG] No Tuya EF00 manager available');
        return false;
      }

      if (!Array.isArray(gangConfigs) || gangConfigs.length === 0) {
        this.error('[TUYA-MULTI-GANG] Invalid gang configs');
        return false;
      }

      this.log(`[TUYA-MULTI-GANG] Setting inching mode for ${gangConfigs.length} gangs`);

      // Build payload: 3 bytes per gang
      const payload = [];

      for (const config of gangConfigs) {
        const { gang, enabled, duration } = config;

        // Validate
        if (gang < 1 || gang > this.gangCount) {
          this.error(`[TUYA-MULTI-GANG] Invalid gang: ${gang}`);
          continue;
        }

        if (duration < 1 || duration > 3600) {
          this.error(`[TUYA-MULTI-GANG] Invalid duration: ${duration}s`);
          continue;
        }

        // Byte 1: Enable/Disable (0=Enable, 1=Disable - inversé!)
        payload.push(enabled ? 0x00 : 0x01);

        // Bytes 2-3: Duration (big-endian)
        payload.push((duration >> 8) & 0xFF);
        payload.push(duration & 0xFF);

        this.log(`[TUYA-MULTI-GANG]   Gang ${gang}: ${enabled ? 'Enabled' : 'Disabled'}, ${duration}s`);
      }

      // Write to DP19
      await this.tuyaEF00.writeDP(19, Buffer.from(payload));

      this.log('[TUYA-MULTI-GANG] ✅ Inching mode set successfully');
      return true;

    } catch (err) {
      this.error('[TUYA-MULTI-GANG] Error setting inching mode:', err);
      return false;
    }
  }

  /**
   * Apply all settings from device settings
   */
  async applyAllSettings() {
    try {
      this.log('[TUYA-MULTI-GANG] Applying all settings...');

      const settings = this.device.getSettings();

      // LED behavior (DP15)
      if (settings.led_behavior !== undefined) {
        await this.setLEDBehavior(parseInt(settings.led_behavior));
      }

      // Backlight (DP16)
      if (settings.backlight !== undefined) {
        await this.setBacklight(settings.backlight);
      }

      // Main power-on behavior (DP14)
      if (settings.power_on_behavior !== undefined) {
        await this.setMainPowerOnBehavior(parseInt(settings.power_on_behavior));
      }

      // Per-gang power-on behavior (DP29-32)
      for (let gang = 1; gang <= Math.min(4, this.gangCount); gang++) {
        const settingKey = `power_on_behavior_${gang}`;
        if (settings[settingKey] !== undefined) {
          await this.setGangPowerOnBehavior(gang, parseInt(settings[settingKey]));
        }
      }

      // Countdown timers (DP7-10)
      for (let gang = 1; gang <= Math.min(4, this.gangCount); gang++) {
        const enabledKey = `countdown_enabled_${gang}`;
        const durationKey = `countdown_duration_${gang}`;

        if (settings[enabledKey] && settings[durationKey]) {
          await this.setCountdownTimer(gang, parseInt(settings[durationKey]));
        }
      }

      // Inching mode (DP19)
      const inchingConfigs = [];
      for (let gang = 1; gang <= this.gangCount; gang++) {
        const enabledKey = `inching_mode_${gang}`;
        const durationKey = `inching_duration_${gang}`;

        if (settings[enabledKey] !== undefined) {
          inchingConfigs.push({
            gang,
            enabled: settings[enabledKey],
            duration: parseInt(settings[durationKey] || 60)
          });
        }
      }

      if (inchingConfigs.length > 0) {
        await this.setInchingMode(inchingConfigs);
      }

      this.log('[TUYA-MULTI-GANG] ✅ All settings applied successfully');
      return true;

    } catch (err) {
      this.error('[TUYA-MULTI-GANG] Error applying settings:', err);
      return false;
    }
  }

  /**
   * Get current configuration status
   * @returns {object} Configuration status
   */
  getStatus() {
    return {
      gangCount: this.gangCount,
      hasTuyaEF00: !!this.tuyaEF00,
      capabilities: this.device.getCapabilities(),
      settings: this.device.getSettings()
    };
  }

  /**
   * Cleanup on device removal
   */
  cleanup() {
    this.log('[TUYA-MULTI-GANG] Manager cleanup');
    // Nothing to clean up for now
  }
}

module.exports = TuyaMultiGangManager;
