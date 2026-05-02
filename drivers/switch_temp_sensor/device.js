'use strict';

const { safeDivide, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Switch with Temperature Sensor - v5.5.402
 */

class SwitchTempSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Switch with Temperature Sensor v5.5.402');
    this.zclNode = zclNode;

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
    }

    await this._setupTemperatureListeners(zclNode);
    this.log('Initialization complete');
  }

  async _setupTemperatureListeners(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    // Method 1: Cluster 57346 (0xE002) - Tuya temp/humidity
    const cluster57346 = ep1.clusters[57346] || ep1.clusters['57346'];
    if (cluster57346) {
      cluster57346.on('attr', (attr, value) => {
        if (attr === 0 || attr === 'measuredValue') this._setTemperature(value / 100);
        if (attr === 1 || attr === 'humidity') this._setHumidity(value / 100);
      });
    }

    // Method 2: Standard ZCL
    const tempCluster = ep1.clusters.temperatureMeasurement;
    if (tempCluster) {
      tempCluster.on('attr.measuredValue', (val) => this._setTemperature(val / 100));
    }

    const humCluster = ep1.clusters.relativeHumidity;
    if (humCluster) {
      humCluster.on('attr.measuredValue', (val) => this._setHumidity(val / 100));
    }
  }

  async _setTemperature(temp) {
    if (typeof temp !== 'number' || isNaN(temp)) return;
    if (temp < -40 || temp > 80) return;
    const rounded = Math.round(temp * 10) / 10;
    if (this.hasCapability('measure_temperature')) {
      await this.setCapabilityValue('measure_temperature', rounded).catch(this.error);
    }
  }

  async _setHumidity(hum) {
    if (typeof hum !== 'number' || isNaN(hum)) return;
    if (hum < 0 || hum > 100) return;
    const rounded = Math.round(hum);
    if (this.hasCapability('measure_humidity')) {
      await this.setCapabilityValue('measure_humidity', rounded).catch(this.error);
    }
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SwitchTempSensorDevice;
