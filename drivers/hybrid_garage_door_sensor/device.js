'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');

/**
 * Hybrid Garage Door + Sensor + Switch Device
 *
 * For Tuya Zigbee devices that function as a garage door opener AND expose
 * contact sensor / switch functionality. These devices have irreconcilable
 * conflicts when registered under separate garage_door, sensor, or switch drivers.
 *
 * Class: "garagedoor" (allows garagedoor_opener + alarm_contact in Homey UI)
 * Capabilities: garagedoor_opener, onoff, measure_battery, alarm_battery, alarm_contact
 *
 * Example: Tuya Zigbee garage door controller with built-in contact sensor
 * and auxiliary relay switch.
 */
class HybridGarageDoorSensorDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      1: { capability: 'garagedoor_opener', divisor: 1 },
      2: { capability: 'onoff', divisor: 1 },
      3: { capability: 'alarm_contact', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_GARAGE_DOOR_SENSOR] Initializing...');

    await super.onNodeInit({ zclNode });

    // Register garage door opener listener
    this.registerCapabilityListener('garagedoor_opener', async (value) => {
      this.log(`[HYBRID_GARAGE_DOOR_SENSOR] Garage door command: ${value}`);
      const dpValue = value === 'open' ? 1 : 0;
      const motorDuration = (this.getSetting('motor_duration') || 10) * 1000;

      try {
        await this.sendTuyaDataPoint(1, dpValue, 'value');
        // Motor runs for configured duration, then auto-stops
        if (motorDuration > 0) {
          setTimeout(async () => {
            try {
              await this.sendTuyaDataPoint(1, 2, 'value'); // Stop command
            } catch { /* device may have already stopped */ }
          }, motorDuration);
        }
      } catch (err) {
        this.error(`[HYBRID_GARAGE_DOOR_SENSOR] Failed to open/close: ${err.message}`);
      }

      // Handle auto-close delay
      const autoCloseDelay = (this.getSetting('auto_close_delay') || 0) * 1000;
      if (autoCloseDelay > 0 && value === 'open') {
        setTimeout(async () => {
          try {
            await this.sendTuyaDataPoint(1, 0, 'value'); // Close command
            this.log('[HYBRID_GARAGE_DOOR_SENSOR] Auto-closing garage door');
          } catch { /* best effort */ }
        }, autoCloseDelay + motorDuration);
      }
    });

    // Register auxiliary switch listener
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[HYBRID_GARAGE_DOOR_SENSOR] Auxiliary switch ${value ? 'ON' : 'OFF'}`);
      try {
        await this.sendTuyaDataPoint(2, value ? 1 : 0, 'value');
      } catch (err) {
        this.error(`[HYBRID_GARAGE_DOOR_SENSOR] Failed to set switch: ${err.message}`);
      }
    });

    this.log('[HYBRID_GARAGE_DOOR_SENSOR] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_GARAGE_DOOR_SENSOR] DP${dpId} = ${value}`);

    const mapping = this.dpMappings[dpId];
    if (mapping) {
      let val = value / (mapping.divisor || 1);

      // Map garage door state
      if (mapping.capability === 'garagedoor_opener') {
        val = value === 1 ? 'open' : 'closed';
      }

      // Map contact sensor (inverted: 1 = open/no contact, 0 = closed/contact)
      if (mapping.capability === 'alarm_contact') {
        val = value === 0; // Contact closed = door open (inverted)
      }

      if (val !== null && val !== undefined) {
        return this.setCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridGarageDoorSensorDevice;
