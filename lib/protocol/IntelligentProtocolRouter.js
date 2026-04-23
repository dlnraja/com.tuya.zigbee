'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');
const CI = require('../utils/CaseInsensitiveMatcher');
const { CLUSTERS } = require('../constants/ZigbeeConstants.js');
const ZigbeeProtocolComplete = require('./ZigbeeProtocolComplete');
const MfrHelper = require('../helpers/ManufacturerNameHelper');

// Inline BSEED detector
const BseedDetector = {
  BSEED_PATTERNS: ['_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', 
    '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt', '_TZ3000_l9brjwau', '_TZ3000_qkixdnon',
    '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu'],
  isBseedDevice(mfr) {
    if (!mfr) return false;
    return CI.containsCI(mfr, this.BSEED_PATTERNS) || CI.containsCI(mfr, 'bseed');
  }
};

/**
 * IntelligentProtocolRouter - v5.7.50
 *
 * Intelligently routes commands between:
 * - Tuya DataPoint (DP) protocol (cluster CLUSTERS.TUYA_EF00)
 * - Native Zigbee protocols (standard clusters)
 * - Proprietary overlays
 */
class IntelligentProtocolRouter {

  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);

    this.protocol = null; 
    this.manufacturerName = null;
    this.hasTuyaCluster = false;
    this.detectedOverlay = null;
    this.proprietaryClusters = [];
  }

  _getManufacturerName() {
    return MfrHelper.getManufacturerName(this.device);
  }

  _getModelId() {
    return MfrHelper.getModelId(this.device);
  }

  detectProprietaryOverlay(manufacturerName) {
    const overlay = ZigbeeProtocolComplete.detectProtocol(manufacturerName);
    const usesTuyaDP = ZigbeeProtocolComplete.usesTuyaDP(manufacturerName);
    const zigbeeVersion = ZigbeeProtocolComplete.detectZigbeeVersion(manufacturerName);
    
    this.detectedOverlay = overlay;
    this.log(`[PROTOCOL-ROUTER] Proprietary overlay: ${overlay} (Tuya DP: ${usesTuyaDP}, Zigbee: ${zigbeeVersion})`);
    
    return { overlay, usesTuyaDP, zigbeeVersion };
  }

  detectProprietaryClusters(zclNode) {
    const clusters = [];
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return clusters;

    const PROPRIETARY_CLUSTER_IDS = {
      [CLUSTERS.TUYA_EF00]: 'TUYA_EF00',
      0xE000: 'TUYA_E000', 
      0xE001: 'TUYA_E001',
      0xED00: 'TUYA_ED00',
      0xFCC0: 'XIAOMI',
      0xFC7C: 'IKEA',
      0xFC00: 'PHILIPS_HUE',
      0xFC0F: 'OSRAM',
      0xFC01: 'LEGRAND',
      0xFC03: 'SCHNEIDER',
      0xFC04: 'DANFOSS',
      0xFC10: 'DEVELCO',
      0xFC11: 'SONOFF',
      0xFC81: 'HEIMAN',
      0xFF01: 'SINOPE'
    };

    for (const [key, cluster] of Object.entries(endpoint.clusters)) {
      const numKey = parseInt(key, 10);
      if (PROPRIETARY_CLUSTER_IDS[numKey]) {
        clusters.push({ id: numKey, name: PROPRIETARY_CLUSTER_IDS[numKey] });
      }
    }

    this.proprietaryClusters = clusters;
    if (clusters.length > 0) {
      this.log(`[PROTOCOL-ROUTER] Proprietary clusters: ${clusters.map(c => c.name).join(', ')}`);
    }

    return clusters;
  }

  async detectProtocol(zclNode, manufacturerName) {
    this.log('[PROTOCOL-ROUTER] Detecting optimal protocol...');
    this.manufacturerName = manufacturerName || this._getManufacturerName();
    
    this.detectProprietaryOverlay(this.manufacturerName);
    this.detectProprietaryClusters(zclNode);

    this.hasTuyaCluster = this.checkTuyaCluster(zclNode);
    const requiresTuyaDP = this.checkManufacturerRequirement(this.manufacturerName);
    const isTS0601 = this.checkIsTS0601();
    const hasStandardClusters = this.checkStandardClusters(zclNode);

    if (isTS0601) {
      if (!this.hasTuyaCluster && hasStandardClusters) {
        this.protocol = 'HYBRID';
        this.log('[PROTOCOL-ROUTER] Selected: HYBRID (TS0601 with standard clusters)');
      } else {
        this.protocol = 'TUYA_DP';
        this.isPassiveMode = !this.hasTuyaCluster;
        this.log(`[PROTOCOL-ROUTER] Selected: TUYA_DP (${this.isPassiveMode ? 'Passive' : 'Active'})`);
      }
    } else if (requiresTuyaDP && this.hasTuyaCluster) {
      this.protocol = 'TUYA_DP';
      this.log('[PROTOCOL-ROUTER] Selected: TUYA_DP (Manufacturer Requirement)');
    } else if (this.hasTuyaCluster && this.shouldPreferTuyaDP(zclNode, this.manufacturerName)) {
      this.protocol = 'TUYA_DP';
      this.log('[PROTOCOL-ROUTER] Selected: TUYA_DP (Optimized Pattern)');
    } else if (this.device?.tuyaEF00Manager) {
      this.protocol = 'TUYA_DP';
      this.isPassiveMode = true;
      this.log('[PROTOCOL-ROUTER] Selected: TUYA_DP (Manager Passive)');
    } else {
      this.protocol = 'ZIGBEE_NATIVE';
      this.log('[PROTOCOL-ROUTER] Selected: ZIGBEE_NATIVE');
    }

    return this.protocol;
  }

  checkIsTS0601() {
    const deviceData = this.device.getData?.() || {};
    const modelId = deviceData.modelId || this.device.getSetting?.('zb_model_id') || '';
    return CI.equalsCI(modelId, 'TS0601');
  }

  checkTuyaCluster(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    const clusters = endpoint?.clusters;
    if (!clusters) return false;

    const hasTuya = !!(
      clusters.tuyaManufacturer ||
      clusters.tuyaSpecific ||
      clusters.manuSpecificTuya ||
      clusters[CLUSTERS.TUYA_EF00]
    );

    this.log(`[PROTOCOL-ROUTER] Tuya EF00 cluster: ${hasTuya ? 'FOUND' : 'NOT FOUND'}`);
    return hasTuya;
  }

  checkStandardClusters(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    const clusters = endpoint?.clusters;
    if (!clusters) return false;

    const hasTemp = !!(clusters.temperatureMeasurement || clusters.msTemperatureMeasurement);
    const hasHumidity = !!(clusters.relativeHumidity || clusters.msRelativeHumidity);
    const hasBattery = !!(clusters.powerConfiguration || clusters.genPowerCfg);

    return hasTemp || hasHumidity || hasBattery;
  }

  checkManufacturerRequirement(manufacturerName) {
    if (!manufacturerName) return false;
    if (BseedDetector.isBseedDevice(manufacturerName)) return true;

    const dpPatterns = ['_TZE200_', '_TZE284_'];
    return CI.containsCI(manufacturerName, dpPatterns);
  }

  shouldPreferTuyaDP(zclNode, manufacturerName) {
    const driverId = this.device.driver?.id || '';
    if (/(\d)gang/.test(driverId) && this.hasTuyaCluster) return true;
    
    const deviceData = this.device.getData?.() || {};
    if (CI.equalsCI(deviceData.modelId || '', 'TS0601')) return true;

    return false;
  }

  getProtocol() { return this.protocol || 'ZIGBEE_NATIVE'; }
  isUsingTuyaDP() { return this.protocol === 'TUYA_DP' || this.protocol === 'HYBRID'; }
  isUsingNativeZigbee() { return this.protocol === 'ZIGBEE_NATIVE' || this.protocol === 'HYBRID'; }

  async setOn(endpoint = 1, options = {}) {
    if (this.isUsingTuyaDP()) return await this.setOnViaTuyaDP(endpoint, options);
    return await this.setOnViaZigbee(endpoint, options);
  }

  async setOff(endpoint = 1, options = {}) {
    if (this.isUsingTuyaDP()) return await this.setOffViaTuyaDP(endpoint, options);
    return await this.setOffViaZigbee(endpoint, options);
  }

  async setOnViaTuyaDP(endpoint, options) {
    if (!this.device.tuyaEF00Manager) throw new Error('TuyaEF00Manager not available');
    await this.device.tuyaEF00Manager.sendTuyaDP(endpoint, 0x01, true);
  }

  async setOffViaTuyaDP(endpoint, options) {
    if (!this.device.tuyaEF00Manager) throw new Error('TuyaEF00Manager not available');
    await this.device.tuyaEF00Manager.sendTuyaDP(endpoint, 0x01, false);
  }

  async setOnViaZigbee(endpoint, options) {
    const ep = this.device.zclNode?.endpoints?.[endpoint];
    if (!ep?.clusters?.onOff) throw new Error('OnOff cluster not available');
    await ep.clusters.onOff.setOn();
  }

  async setOffViaZigbee(endpoint, options) {
    const ep = this.device.zclNode?.endpoints?.[endpoint];
    if (!ep?.clusters?.onOff) throw new Error('OnOff cluster not available');
    await ep.clusters.onOff.setOff();
  }

  getDiagnostics() {
    const mfr = this._getManufacturerName();
    return {
      protocol: this.protocol,
      manufacturerName: mfr,
      modelId: this._getModelId(),
      hasTuyaCluster: this.hasTuyaCluster,
      isUsingTuyaDP: this.isUsingTuyaDP(),
      detectedOverlay: this.detectedOverlay,
      proprietaryClusters: this.proprietaryClusters.map(c => c.name),
      zigbeeVersion: ZigbeeProtocolComplete.detectZigbeeVersion(mfr),
      usesTuyaDP: ZigbeeProtocolComplete.usesTuyaDP(mfr)
    };
  }

  static getAllSupportedProtocols() { return ZigbeeProtocolComplete.getAllProtocols(); }
  static getManufacturerCount() { return ZigbeeProtocolComplete.getManufacturersCount(); }
}

IntelligentProtocolRouter.ZigbeeProtocolComplete = ZigbeeProtocolComplete;
IntelligentProtocolRouter.BseedDetector = BseedDetector;

module.exports = IntelligentProtocolRouter;
