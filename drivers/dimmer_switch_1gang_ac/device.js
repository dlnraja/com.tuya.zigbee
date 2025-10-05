'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.enableDebug();
    this.printNode();

    // Register capabilities using numeric Zigbee clusters (SDK3 best practice)
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 6);
    }
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 8);
    }

    // Minimal EF00 fallback scaffolding (non-breaking): detect clusters and store flags
    try {
      const ep1 = this.zclNode && this.zclNode.endpoints && this.zclNode.endpoints[1];
      const hasLevelCluster = !!(ep1 && ep1.clusters && (ep1.clusters[8] || ep1.clusters['8']));
      const hasEF00Cluster = !!(ep1 && ep1.clusters && (ep1.clusters[61184] || ep1.clusters['61184']));
      this.log('Cluster presence - Level(0x0008):', hasLevelCluster, ' EF00(0xEF00):', hasEF00Cluster);
      await this.setStoreValue('level_cluster_present', hasLevelCluster).catch(() => {});
      await this.setStoreValue('ef00_cluster_present', hasEF00Cluster).catch(() => {});
    } catch (e) {
      this.error('EF00 fallback scaffolding init failed:', e.message);
    }
  }
}

module.exports = Device;