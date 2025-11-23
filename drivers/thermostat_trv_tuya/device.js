'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
const BatteryManagerV3 = require('../../lib/BatteryManagerV3');

/**
 * TRV Thermostat - TS0601
 * Issue #77
 *
 * Tuya DP Map:
 * - DP 2: target_temperature (°C * 10)
 * - DP 3: current_temperature (°C * 10)
 * - DP 4: mode (0=manual, 1=auto, 2=away)
 * - DP 15: battery %
 */
class TRVTuyaDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TRV Thermostat initializing...');

    // Tuya EF00 Manager
    this.tuyaEF00Manager = new TuyaEF00Manager(this);
    await this.tuyaEF00Manager.initialize(zclNode);

    // DP Listeners
    this.setupDPListeners();

    // Battery Manager V3
    this.batteryManager = new BatteryManagerV3(this);
    await this.batteryManager.startMonitoring();

    // Capability listeners
    this.registerCapabilityListener('target_temperature', async (value) => {
      const dpValue = Math.round(value * 10);
      await this.tuyaEF00Manager.sendTuyaDP(2, 0x02, dpValue); // Value type
      this.log(`Target temp set: ${value}°C`);
    });

    this.log('✅ TRV ready');
  }

  setupDPListeners() {
    // DP 2: Target temperature
    this.tuyaEF00Manager.on('dp-2', (value) => {
      const temp = value / 10;
      this.log(`Target temp: ${temp}°C`);
      this.setCapabilityValue('target_temperature', temp).catch(this.error);
    });

    // DP 3: Current temperature
    this.tuyaEF00Manager.on('dp-3', (value) => {
      const temp = value / 10;
      this.log(`Current temp: ${temp}°C`);
      this.setCapabilityValue('measure_temperature', temp).catch(this.error);
    });

    // DP 15: Battery
    this.tuyaEF00Manager.on('dp-15', (value) => {
      this.log(`Battery: ${value}%`);
      this.setCapabilityValue('measure_battery', value).catch(this.error);
    });
  }

  async onDeleted() {
    if (this.batteryManager) {
      this.batteryManager.stopMonitoring();
    }
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.cleanup();
    }
  }
}

module.exports = TRVTuyaDevice;
