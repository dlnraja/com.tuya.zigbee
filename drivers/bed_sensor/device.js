'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Bed Sensor Device - Pressure-based occupancy detection
 *
 * Z2M-confirmed DP mappings for _TZE200_seq9cm6u:
 * - DP1: presence (trueFalse0: 0=occupied, 1=unoccupied)
 * - DP4: battery (raw 0-100%, some devices send 0/1 binary)
 * - DP9: sensitivity (enum: low/middle/high)
 * - DP12: illuminance (raw value)
 * - DP101: interval_time (sampling interval, 5-720 min)
 * - DP102: presence_delay (delay to report unoccupied, 0-3600s)
 * - DP103: presence_time (delay to report occupied, 0-3600s)
 * - DP104: work_state (READ-ONLY, NOT battery)
 *
 * GitHub Issue: #383, #424
 * Z2M Reference: zigbee-herdsman-converters tuya.ts
 */

class BedSensorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BED] Bed Sensor initializing...');

    this._destroyed = false;
    this._lastDPReceived = false;
    this._setupDPListeners();
    this._setupDPolling();
  }

  _setupDPListeners() {
    // Z2M-confirmed DP mappings for bed sensor
    // NOTE: UnifiedSensorBase uses 'transform' not 'converter'
    const dpMappings = {
      // DP12: Illuminance (Z2M confirms illuminance, not pressure)
      12: {
        capability: 'measure_luminance',
        transform: (v) => v
      },
    };

    if (this._dpMappings) {
      Object.assign(this._dpMappings, dpMappings);
    } else {
      this._dpMappings = dpMappings;
    }

    // Remove DP4 from dpMappings so _handleBatteryDP override works
    // (parent _handleCommonDP also handles DP4 via battery DPs list)
    delete this._dpMappings[4];

    this.log('[BED] DP mappings configured:', Object.keys(dpMappings));
  }

  /**
   * Override battery DP handling for bed sensor
   * Device sends raw 0 or 1 (binary), not actual percentage
   * Z2M: 0=depleted->10%, 1=OK->100%
   */
  _handleBatteryDP(dp, value) {
    if (dp === 4) {
      // Binary battery: 0=depleted, 1=OK
      // Also handle normal 0-100% values
      let batteryValue;
      if (value === 0) {
        batteryValue = 10; // depleted -> 10%
      } else if (value === 1) {
        batteryValue = 100; // OK -> 100%
      } else if (typeof value === 'number' && value >= 0 && value <= 100) {
        batteryValue = value; // normal percentage
      } else {
        batteryValue = 100; // fallback
      }
      this.log(`[BED] Battery DP4: raw=${value} -> ${batteryValue}%`);
      this.setCapabilityValue('measure_battery', batteryValue).catch(() => {});
      this._lastDPReceived = true;
      return;
    }
    // Fallback to parent handler
    super._handleBatteryDP(dp, value);
  }

  /**
   * Override _handleCommonDP to handle DP1 for alarm_contact
   * The parent class only handles DP1->alarm_motion, not alarm_contact
   */
  async _handleCommonDP(dp, rawValue) {
    const value = this._parseValue(rawValue);

    // Handle DP1 for alarm_contact (bed sensor specific)
    // Z2M trueFalse0: 0=occupied (alarm_contact=true), 1=unoccupied (alarm_contact=false)
    if (dp === 1 && this.hasCapability('alarm_contact')) {
      const occupied = value === 0;
      this.log(`[BED] Presence: ${occupied ? 'OCCUPIED' : 'VACANT'} (DP1=${value})`);
      this.setCapabilityValue('alarm_contact', occupied).catch(() => {});
      this._lastDPReceived = true;

      // Fire flow triggers
      try {
        if (occupied) {
          this.homey.flow.getDeviceTriggerCard('bed_sensor_occupied')?.trigger(this).catch(() => {});
        } else {
          this.homey.flow.getDeviceTriggerCard('bed_sensor_vacant')?.trigger(this).catch(() => {});
        }
      } catch (err) {
        this.error('[BED] Flow trigger error:', err.message);
      }
      return; // Skip parent handling for DP1
    }

    // Handle DP104: work_state (read-only enum, NOT battery)
    // Z2M: 0=presence, 1=none, 2=presence_5min, 3=presence_30min, 4=none_5min, 5=none_30min
    if (dp === 104) {
      const states = ['presence', 'none', 'presence_5min', 'presence_30min', 'none_5min', 'none_30min'];
      const stateName = states[value] || `unknown_${value}`;
      this.log(`[BED] Work state: ${stateName} (DP104=${value})`);
      return; // Read-only, no capability update
    }

    // Call parent for all other DPs
    await super._handleCommonDP(dp, rawValue);
  }

  /**
   * Setup periodic DP polling for sleepy end devices
   * Battery-powered Tuya devices don't send data spontaneously
   * Z2M/ZHA pattern: query DPs after initialization
   */
  _setupDPolling() {
    // Delayed initial query (3s after init)
    this._initQueryTimeout = setTimeout(async () => {
      if (this._destroyed) return;
      try {
        this.log('[BED] Requesting initial DP data...');
        const dps = [1, 4, 12];
        for (const dp of dps) {
          if (this._destroyed) break;
          // Use tuyaEF00Manager if available
          if (this.tuyaEF00Manager?.requestDP) {
            await this.tuyaEF00Manager.requestDP(dp).catch(() => {});
          } else if (typeof this.requestDP === 'function') {
            await this.requestDP(dp).catch(() => {});
          }
          await new Promise(r => setTimeout(r, 500)); // 500ms between requests
        }
      } catch (err) {
        this.error('[BED] Initial DP query failed:', err.message);
      }
    }, 3000);

    // Periodic polling every 30 seconds (stops after first data received)
    this._pollInterval = this.homey.setInterval(async () => {
      if (this._destroyed || this._lastDPReceived) {
        clearInterval(this._pollInterval);
        return;
      }
      try {
        this.log('[BED] Polling DPs...');
        if (this.tuyaEF00Manager?.requestDP) {
          await this.tuyaEF00Manager.requestDP(1).catch(() => {});
        } else if (typeof this.requestDP === 'function') {
          await this.requestDP(1).catch(() => {});
        }
      } catch (err) {
        this.error('[BED] Poll failed:', err.message);
      }
    }, 30000);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });

    // Handle settings changes for DP9 (sensitivity), DP102, DP103
    for (const key of changedKeys) {
      if (key === 'sensitivity') {
        const enumMap = { low: 0, middle: 1, high: 2 };
        const value = enumMap[newSettings.sensitivity] ?? 1;
        await this._sendSettingDP(9, value, 'enum');
      }
      if (key === 'presence_delay') {
        await this._sendSettingDP(102, newSettings.presence_delay, 'value');
      }
      if (key === 'presence_time') {
        await this._sendSettingDP(103, newSettings.presence_time, 'value');
      }
    }
  }

  async _sendSettingDP(dp, value, type) {
    try {
      if (this.tuyaEF00Manager?.sendDP) {
        await this.tuyaEF00Manager.sendDP(dp, value, type);
        this.log(`[BED] Setting DP${dp} = ${value} (${type})`);
      } else if (this.tuyaEF00Manager?.sendTuyaDP) {
        const typeMap = { raw: 0, bool: 1, value: 2, string: 3, enum: 4 };
        await this.tuyaEF00Manager.sendTuyaDP(dp, typeMap[type] ?? 2, value);
        this.log(`[BED] Setting DP${dp} = ${value} via sendTuyaDP`);
      }
    } catch (err) {
      this.error(`[BED] Failed to set DP${dp}:`, err.message);
    }
  }

  async onUninit() {
    this._destroyed = true;
    if (this._initQueryTimeout) clearTimeout(this._initQueryTimeout);
    if (this._pollInterval) clearInterval(this._pollInterval);
    this.log('[BED] Bed Sensor uninitialized');
    await super.onUninit();
  }

  async onDeleted() {
    this._destroyed = true;
    this.log('[BED] Bed Sensor deleted');
    await super.onDeleted();
  }
}

module.exports = BedSensorDevice;
