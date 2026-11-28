'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
    this._registerConditionCards();
    this.log('ClimateSensorDriver initialized');
  }

  _registerConditionCards() {
    const register = (id, fn) => {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card && typeof card.registerRunListener === 'function') {
          card.registerRunListener(fn);
        }
      } catch (err) {
        this.log(`[FLOW] condition ${id} soft-skip: ${err.message}`);
      }
    };

    register('climate_sensor_temperature_above', async (args) => {
      const val = args?.device?.getCapabilityValue?.('measure_temperature');
      return val !== null && val !== undefined && Number(val) > Number(args.temp);
    });

    register('climate_sensor_temperature_below', async (args) => {
      const val = args?.device?.getCapabilityValue?.('measure_temperature');
      return val !== null && val !== undefined && Number(val) < Number(args.temp);
    });

    register('climate_sensor_humidity_above', async (args) => {
      const val = args?.device?.getCapabilityValue?.('measure_humidity');
      return val !== null && val !== undefined && Number(val) > Number(args.humidity);
    });

    register('climate_sensor_humidity_below', async (args) => {
      const val = args?.device?.getCapabilityValue?.('measure_humidity');
      return val !== null && val !== undefined && Number(val) < Number(args.humidity);
    });

    register('climate_sensor_battery_voltage_below', async (args) => {
      const dev = args?.device;
      if (!dev) { return false; }
      const raw = dev.getCapabilityValue?.('measure_battery.voltage')
        ?? dev.getCapabilityValue?.('measure_voltage')
        ?? dev.getStoreValue?.('battery_voltage');
      return raw !== null && raw !== undefined && Number(raw) < Number(args.voltage);
    });
  }
}

module.exports = ClimateSensorDriver;
