'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ComprehensiveAirMonitorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.enableDebug();
    this.printNode();

    // Register measurements using numeric Zigbee clusters
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 1026); // temperatureMeasurement
    }
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 1029); // relativeHumidity
    }
    // CO2/PM2.5 typically via Tuya EF00; fallback runtime can be added when DP map is confirmed

    // Minimal EF00 fallback scaffolding: detect EF00 cluster presence and store flag
    try {
      const ep1 = this.zclNode && this.zclNode.endpoints && this.zclNode.endpoints[1];
      const hasEF00Cluster = !!(ep1 && ep1.clusters && (ep1.clusters[61184] || ep1.clusters['61184']));
      this.log('EF00(0xEF00) present:', hasEF00Cluster);
      await this.setStoreValue('ef00_cluster_present', hasEF00Cluster).catch(() => {});
    } catch (e) {
      this.error('EF00 scaffolding init failed:', e.message);
    }
  }
}

module.exports = ComprehensiveAirMonitorDevice;
