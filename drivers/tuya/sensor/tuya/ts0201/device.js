'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0201TempHumiditySensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Temperature measurement
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      get: 'measuredValue',
      getOpts: {
        getOnStart: true,
        pollInterval: 300000, // Poll every 5 minutes
      },
      reportParser: (value) => {
        // Convert from 0.01°C to °C
        const temp = value / 100;
        this.log('Temperature:', temp, '°C');
        return temp;
      },
    });

    // Humidity measurement
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      get: 'measuredValue',
      getOpts: {
        getOnStart: true,
        pollInterval: 300000, // Poll every 5 minutes
      },
      reportParser: (value) => {
        // Convert from 0.01% to %
        const humidity = value / 100;
        this.log('Humidity:', humidity, '%');
        return humidity;
      },
    });

    // Battery monitoring
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true,
        pollInterval: 600000, // Poll every 10 minutes
      },
      reportParser: (value) => {
        const battery = value / 2; // Convert from 0.5% to %
        this.log('Battery:', battery, '%');
        return battery;
      },
    });
  }

  onDeleted() {
    this.log('TS0201 Temp & Humidity Sensor removed');
  }
}

module.exports = TS0201TempHumiditySensor;
