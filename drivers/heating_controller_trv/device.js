'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Zigbee TRV Heating Controller
 * Supports Danfoss, Eurotronic, Tuya, Moes TRVs
 */
class HeatingControllerTRVDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Heating Controller TRV initializing...');

    const endpoint = zclNode.endpoints[1];

    // Target temperature
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        this.log(`[TRV] Setting target temperature: ${value}°C`);

        // Try thermostat cluster first
        if (endpoint?.clusters?.thermostat) {
          await endpoint.clusters.thermostat.writeAttributes({
            occupiedHeatingSetpoint: Math.round(value * 100)
          });
        }
        // Fallback to Tuya DP
        else if (this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.sendDP(2, Math.round(value * 10), 0x02);
        }
        return value;
      });

      // Listen for setpoint changes
      if (endpoint?.clusters?.thermostat) {
        endpoint.clusters.thermostat.on('attr.occupiedHeatingSetpoint', (value) => {
          const temp = value / 100;
          this.log(`[TRV] Target temperature: ${temp}°C`);
          this.setCapabilityValue('target_temperature', temp).catch(this.error);
        });
      }
    }

    // Measured temperature
    if (this.hasCapability('measure_temperature')) {
      if (endpoint?.clusters?.thermostat) {
        endpoint.clusters.thermostat.on('attr.localTemperature', (value) => {
          const temp = value / 100;
          const offset = this.getSetting('temperature_offset') || 0;
          this.log(`[TRV] Local temperature: ${temp + offset}°C`);
          this.setCapabilityValue('measure_temperature', temp + offset).catch(this.error);
        });
      }
    }

    // Thermostat mode
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value) => {
        this.log(`[TRV] Setting mode: ${value}`);
        const modeMap = { 'off': 0, 'auto': 1, 'heat': 4 };

        if (endpoint?.clusters?.thermostat) {
          await endpoint.clusters.thermostat.writeAttributes({
            systemMode: modeMap[value] || 1
          });
        }
        return value;
      });
    }

    // Battery
    if (this.hasCapability('measure_battery') && endpoint?.clusters?.genPowerCfg) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2)
      });
    }

    // Initialize Tuya DP engine for TS0601 devices
    await this._initTuyaDP(zclNode);

    this.log('Heating Controller TRV initialized');
  }

  async _initTuyaDP(zclNode) {
    try {
      const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      await this.tuyaEF00Manager.initialize(zclNode);

      // Listen for Tuya DP reports
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleTuyaDP(dpId, value);
      });
    } catch (e) {
      this.log('[TRV] Tuya DP not available:', e.message);
    }
  }

  _handleTuyaDP(dpId, value) {
    this.log(`[TRV] Tuya DP${dpId}: ${value}`);

    switch (dpId) {
      case 2: // Target temperature (x10)
        this.setCapabilityValue('target_temperature', value / 10).catch(this.error);
        break;
      case 3: // Local temperature (x10)
        const offset = this.getSetting('temperature_offset') || 0;
        this.setCapabilityValue('measure_temperature', value / 10 + offset).catch(this.error);
        break;
      case 4: // Mode (0=auto, 1=manual, 2=off)
        const modeMap = { 0: 'auto', 1: 'heat', 2: 'off' };
        this.setCapabilityValue('thermostat_mode', modeMap[value] || 'auto').catch(this.error);
        break;
      case 13: // Battery percentage
      case 14:
      case 15:
        this.setCapabilityValue('measure_battery', value).catch(this.error);
        break;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[TRV] Settings changed:', changedKeys);

    if (changedKeys.includes('child_lock') && this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.sendDP(7, newSettings.child_lock ? 1 : 0, 0x01);
    }

    if (changedKeys.includes('window_detection') && this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.sendDP(8, newSettings.window_detection ? 1 : 0, 0x01);
    }
  }
}

module.exports = HeatingControllerTRVDevice;
