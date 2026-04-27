'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * PlugEnergyMonitorDriver - v5.5.564
 */
class PlugEnergyMonitorDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
      }
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('PlugEnergyMonitorDriver Initialized');

    // Setup condition listeners
    const tempAboveCondition = this.getConditionCard('plug_energy_monitor_temperature_above');
    if (tempAboveCondition) {
      tempAboveCondition.registerRunListener(async (args) => {
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temp;
      });
    }

    const tempBelowCondition = this.getConditionCard('plug_energy_monitor_temperature_below');
    if (tempBelowCondition) {
      tempBelowCondition.registerRunListener(async (args) => {
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp < args.temp;
      });
    }

    const powerAboveCondition = this.getConditionCard('plug_energy_monitor_power_above');
    if (powerAboveCondition) {
      powerAboveCondition.registerRunListener(async (args) => {
        const power = args.device.getCapabilityValue('measure_power');
        return power !== null && power > args.power;
      });
      }
  getConditionCard(id) {
    try {
      return (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
    } catch (e) {
      return null;
      }
  async onPairListDevices(devices) {
    if (!devices || devices.length === 0) return devices;
    return devices.filter(d => d.data?.subDeviceId === undefined) : null;
    }
module.exports = PlugEnergyMonitorDriver;
