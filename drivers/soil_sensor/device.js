'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const ZclDataMapper = require('../../lib/zigbee/zcl-data-mapper');

class SoilSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('SoilSensor device onNodeInit');

    // Register standard ZCL capabilities
    this.registerCapability('measure_temperature', 'temperatureMeasurement', {
      reportParser: (value) => ZclDataMapper.mapTemperatureFromZcl(value),
    });
    this.registerCapability('measure_humidity', 'relativeHumidity', {
      reportParser: (value) => ZclDataMapper.mapHumidityFromZcl(value),
    });
    this.registerCapability('alarm_battery', 'genPowerCfg');

    // Register Tuya-specific DP handlers
    this.registerTuyaManuSpecificCluster({
      endpointId: 1,
      cluster: 'manuSpecificTuya',
      handlers: {
        105: (dp, parsedValue) => { // Soil moisture
          let moisture = parsedValue.value;
          if (moisture > 100) {
            moisture = moisture / 10;
          }
          this.log(`[Tuya] Received soil moisture: ${parsedValue.value}, normalized: ${moisture}`);
          this.setCapabilityValue('measure_soil_moisture', moisture).catch(this.error);
        },
      },
    });
  }
}

module.exports = SoilSensorDevice;
