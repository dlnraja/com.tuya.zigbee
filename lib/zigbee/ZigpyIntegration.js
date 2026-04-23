'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { CLUSTERS } = require('../constants/ZigbeeConstants.js');

/**
 * ZigpyIntegration - Bridge between Homey and zigpy concepts
 */
class ZigpyIntegration {

  constructor(device) {
    this.device = device;
    this.zigpyFeatures = {
      otaSupport: false,
      quirksApplied: [],
      manufacturerClusters: [],
      enhancedReporting: false
    };
  }

  async initialize() {
    this.device.log('[Zigpy] Initializing...');
    try {
      await this.detectManufacturerClusters();
      await this.checkOTASupport();
      await this.applyKnownQuirks();
      await this.setupEnhancedReporting();
      this.device.log('[Zigpy] Initialized');
    } catch (err) {
      this.device.error('[Zigpy] Initialization failed:', err);
    }
  }

  async detectManufacturerClusters() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const knownManufacturerClusters = {
      [CLUSTERS.TUYA_EF00]: 'Tuya DP Cluster',
      0xE000: 'Tuya Unknown',
      0xE001: 'Tuya Switch Mode',
      0xE002: 'Tuya Sensor Alarms',
      0xFC7C: 'IKEA Cluster 1',
      0xFC00: 'Philips Cluster 1'
    };

    for (const [clusterId, name] of Object.entries(knownManufacturerClusters)) {
      const id = parseInt(clusterId);
      if (endpoint.clusters[id]) {
        this.zigpyFeatures.manufacturerClusters.push({ id, name });
      }
    }
  }

  async checkOTASupport() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;
    if (endpoint.clusters[25]) {
      this.zigpyFeatures.otaSupport = true;
    }
  }

  async applyKnownQuirks() {
    const manufacturerName = this.device.getData().manufacturerName;
    const modelId = this.device.getData().productId;
    const mfrLower = CI.normalize(manufacturerName || '');
    const modelLower = CI.normalize(modelId || '');

    if (mfrLower.startsWith('_tz') || modelLower === 'ts0601') {
      await this.applyTuyaMagicSpell();
    }
  }

  async applyTuyaMagicSpell() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      const basicCluster = endpoint?.clusters[0];
      if (!basicCluster) return;

      const magicAttributes = [4, 0, 1, 5, 7, 0xFFFE];
      await basicCluster.readAttributes(magicAttributes).catch(() => {});
      this.zigpyFeatures.quirksApplied.push('tuya_magic_spell');
    } catch (err) {}
  }

  async setupEnhancedReporting() {
    // Simplified reporting setup
  }

  getStatus() {
    return this.zigpyFeatures;
  }

  exportDeviceInfo() {
    return {
      manufacturer: this.device.getData().manufacturerName,
      model: this.device.getData().productId,
      ieee: this.device.getData().ieeeAddress,
      endpoints: Object.keys(this.device.zclNode?.endpoints || {}),
      manufacturerClusters: this.zigpyFeatures.manufacturerClusters,
      otaSupport: this.zigpyFeatures.otaSupport,
      quirksApplied: this.zigpyFeatures.quirksApplied
    };
  }
}

module.exports = ZigpyIntegration;
