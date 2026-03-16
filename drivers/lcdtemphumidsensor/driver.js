'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LCDTempHumidSensorDriver extends ZigBeeDriver {
  async onInit() {
    this.log('═══════════════════════════════════════════════════════════');
    this.log('  LCD TEMPERATURE/HUMIDITY SENSOR DRIVER v5.4.3          ');
    this.log('  TS0201 with LCD display                                 ');
    this.log('═══════════════════════════════════════════════════════════');
    this._registeredIeeeAddresses = new Set();
    try {
    this.homey.flow.getConditionCard('lcdtemphumidsensor_temp_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_temperature') || 0) > args.temperature;
    });
    this.homey.flow.getConditionCard('lcdtemphumidsensor_humidity_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_humidity') || 0) > args.humidity;
    });
    } catch (e) { this.log('Flow cards unavailable:', e.message); }
  }

  async onPairListDevices(devices) {
    // Filter out sub-devices
    const seenIeeeAddresses = new Set();
    const filteredDevices = [];

    for (const device of devices) {
      const ieee = device.settings?.zb_ieee_address || device.data?.ieeeAddress;

      if (device.data?.subDeviceId !== undefined) {
        this.log('[PAIR] 🚫 Blocking sub-device: subDeviceId=', device.data.subDeviceId);
        continue;
      }

      if (ieee && (seenIeeeAddresses.has(ieee) || this._registeredIeeeAddresses?.has(ieee))) {
        continue;
      }

      if (ieee) seenIeeeAddresses.add(ieee);
      filteredDevices.push(device);
    }

    return filteredDevices;
  }
}

module.exports = LCDTempHumidSensorDriver;
