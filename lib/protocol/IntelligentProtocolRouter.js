'use strict';

const ZigbeeProtocolComplete = require('./ZigbeeProtocolComplete');
const MfrHelper = require('../helpers/ManufacturerNameHelper');

// Inline BSEED detector (was separate file)
const BseedDetector = {
  BSEED_PATTERNS: ['_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', 
    '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt', '_TZ3000_l9brjwau', '_TZ3000_qkixdnon',
    '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu'],
  isBseedDevice(mfr) {
    if (!mfr) return false;
    const lower = mfr.toLowerCase();
    return this.BSEED_PATTERNS.some(p => lower.includes(p.toLowerCase())) || lower.includes('bseed');
  }
};

/**
 * IntelligentProtocolRouter - v5.7.50
 *
 * Intelligently routes commands between:
 * - Tuya DataPoint (DP) protocol (cluster 0xEF00)
 * - Tuya Extended clusters (0xE000, 0xE001, 0xED00)
 * - Native Zigbee protocols (standard clusters)
 * - Other proprietary overlays (Xiaomi, IKEA, Philips, etc.)
 *
 * v5.7.50: Enhanced with ZigbeeProtocolComplete integration
 * - 30+ proprietary protocols supported
 * - 300+ manufacturer detection
 * - Dynamic adaptive routing
 *
 * References:
 * - developer.tuya.com/en/docs/connect-subdevices-to-gateways
 * - zigpy discussion: github.com/zigpy/zigpy/discussions/823
 */

class IntelligentProtocolRouter {

  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);

    this.protocol = null; // Will be set to 'TUYA_DP', 'ZIGBEE_NATIVE', or 'HYBRID'
    this.manufacturerName = null;
    this.hasTuyaCluster = false;
    this.detectedOverlay = null; // v5.7.50: Detected proprietary overlay
    this.proprietaryClusters = []; // v5.7.50: Detected proprietary clusters
  }

  /**
   * v5.7.51: Get manufacturer name using ManufacturerNameHelper
   */
  _getManufacturerName() {
    return MfrHelper.getManufacturerName(this.device);
  }

  /**
   * v5.7.51: Get model ID using ManufacturerNameHelper
   */
  _getModelId() {
    return MfrHelper.getModelId(this.device);
  }

  /**
   * v5.7.50: Detect proprietary overlay using ZigbeeProtocolComplete
   */
  detectProprietaryOverlay(manufacturerName) {
    const overlay = ZigbeeProtocolComplete.detectProtocol(manufacturerName);
    const usesTuyaDP = ZigbeeProtocolComplete.usesTuyaDP(manufacturerName);
    const zigbeeVersion = ZigbeeProtocolComplete.detectZigbeeVersion(manufacturerName);
    
    this.detectedOverlay = overlay;
    
    this.log(`[PROTOCOL-ROUTER] 🔍 Proprietary overlay: ${overlay}`);
    this.log(`[PROTOCOL-ROUTER]    Uses Tuya DP: ${usesTuyaDP}`);
    this.log(`[PROTOCOL-ROUTER]    Zigbee version: ${zigbeeVersion}`);
    
    return { overlay, usesTuyaDP, zigbeeVersion };
  }

  /**
   * v5.7.50: Detect all proprietary clusters on device
   */
  detectProprietaryClusters(zclNode) {
    const clusters = [];
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return clusters;

    const PROPRIETARY_CLUSTER_IDS = {
      0xEF00: 'TUYA_EF00',
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
      this.log(`[PROTOCOL-ROUTER] 🏷️ Proprietary clusters: ${clusters.map(c => c.name).join(', ')}`);
    }

    return clusters;
  }

  /**
   * Detect and set the optimal protocol for this device
   * v5.7.50: Enhanced with ZigbeeProtocolComplete integration
   * @param {ZCLNode} zclNode - Zigbee node
   * @param {string} manufacturerName - Device manufacturer
   * @returns {string} Selected protocol: 'TUYA_DP', 'ZIGBEE_NATIVE', or 'HYBRID'
   */
  async detectProtocol(zclNode, manufacturerName) {
    this.log('[PROTOCOL-ROUTER] 🔍 Detecting optimal protocol (v5.7.50)...');
    this.manufacturerName = manufacturerName || this._getManufacturerName();
    
    // v5.7.50: Detect proprietary overlay and clusters
    this.detectProprietaryOverlay(this.manufacturerName);
    this.detectProprietaryClusters(zclNode);

    // Check for Tuya EF00 cluster (physical presence)
    this.hasTuyaCluster = this.checkTuyaCluster(zclNode);

    // Check if manufacturer requires Tuya DP
    const requiresTuyaDP = this.checkManufacturerRequirement(manufacturerName);

    // Check if it's a TS0601 device (ALWAYS uses Tuya DP, even without visible cluster)
    const isTS0601 = this.checkIsTS0601(zclNode);

    // Check if TuyaEF00Manager is initialized (passive mode)
    const hasTuyaManager = !!this.device?.tuyaEF00Manager;

    // v5.2.80: Check if device has standard climate/battery clusters
    // Some TS0601 devices expose standard clusters as alternative protocol
    const hasStandardClusters = this.checkStandardClusters(zclNode);

    // Determine protocol - TS0601 handling
    if (isTS0601) {
      // v5.2.80: If TS0601 has NO visible EF00 cluster BUT HAS standard clusters,
      // use HYBRID mode that prefers standard clusters with DP fallback
      if (!this.hasTuyaCluster && hasStandardClusters) {
        this.protocol = 'HYBRID';
        this.isPassiveMode = true;
        this.useStandardClusters = true;
        this.log('[PROTOCOL-ROUTER] ✅ Selected: HYBRID (TS0601 with standard clusters available!)');
        this.log('[PROTOCOL-ROUTER] ℹ️ Will read temp/humidity/battery from standard clusters');
        this.log('[PROTOCOL-ROUTER] ℹ️ Tuya DPs as fallback/supplement');
      } else {
        this.protocol = 'TUYA_DP';
        this.isPassiveMode = !this.hasTuyaCluster;
        if (this.isPassiveMode) {
          this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (TS0601 passive mode - cluster not visible but using DP events)');
        } else {
          this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (TS0601 device)');
        }
      }
    } else if (requiresTuyaDP && this.hasTuyaCluster) {
      this.protocol = 'TUYA_DP';
      this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (manufacturer requirement + cluster available)');
    } else if (this.hasTuyaCluster && this.shouldPreferTuyaDP(zclNode, manufacturerName)) {
      this.protocol = 'TUYA_DP';
      this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (optimal for this device)');
    } else if (hasTuyaManager) {
      // TuyaEF00Manager is active - use hybrid mode
      this.protocol = 'TUYA_DP';
      this.isPassiveMode = true;
      this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (TuyaEF00Manager active - hybrid mode)');
    } else {
      this.protocol = 'ZIGBEE_NATIVE';
      this.log('[PROTOCOL-ROUTER] ✅ Selected: ZIGBEE_NATIVE (standard Zigbee clusters)');
    }

    return this.protocol;
  }

  /**
   * Check if device is a TS0601 (pure Tuya DP device)
   */
  checkIsTS0601(zclNode) {
    const deviceData = this.device.getData?.() || {};
    const modelId = deviceData.modelId || this.device.getSetting?.('zb_model_id') || this.device.getSetting?.('zb_modelId') || '';
    return modelId === 'TS0601';
  }

  /**
   * Check if device has Tuya EF00 cluster
   * @param {ZCLNode} zclNode - Zigbee node
   * @returns {boolean} True if Tuya cluster present
   */
  checkTuyaCluster(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint || !endpoint.clusters) {
      return false;
    }

    const hasTuya = !!(
      endpoint.clusters.tuyaManufacturer ||
      endpoint.clusters.tuyaSpecific ||
      endpoint.clusters.manuSpecificTuya ||
      endpoint.clusters[0xEF00] ||
      endpoint.clusters[61184]
    );

    this.log(`[PROTOCOL-ROUTER] Tuya cluster (0xEF00): ${hasTuya ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
    return hasTuya;
  }

  /**
   * v5.2.80: Check if device has standard climate/battery clusters
   * Some TS0601 devices expose these as alternative to Tuya DP
   * @param {ZCLNode} zclNode - Zigbee node
   * @returns {boolean} True if standard clusters present
   */
  checkStandardClusters(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint || !endpoint.clusters) {
      return false;
    }

    const clusters = endpoint.clusters;
    const hasTemp = !!(clusters.temperatureMeasurement || clusters.msTemperatureMeasurement);
    const hasHumidity = !!(clusters.relativeHumidity || clusters.msRelativeHumidity);
    const hasBattery = !!(clusters.powerConfiguration || clusters.genPowerCfg);

    const hasClimate = hasTemp || hasHumidity;
    const hasStandard = hasClimate || hasBattery;

    if (hasStandard) {
      this.log(`[PROTOCOL-ROUTER] Standard clusters found: temp=${hasTemp}, humidity=${hasHumidity}, battery=${hasBattery}`);
    }

    return hasStandard;
  }

  /**
   * Check if manufacturer requires Tuya DP protocol
   * @param {string} manufacturerName - Manufacturer name
   * @returns {boolean} True if Tuya DP required
   */
  checkManufacturerRequirement(manufacturerName) {
    if (!manufacturerName) return false;

    // BSEED devices MUST use Tuya DP (known firmware issue)
    if (BseedDetector.isBseedDevice(manufacturerName)) {
      this.log('[PROTOCOL-ROUTER] 🔧 BSEED device detected - REQUIRES Tuya DP');
      return true;
    }

    // Other manufacturers that require Tuya DP
    const requiresTuyaDP = [
      '_TZE200_', // Most TZE200 devices use DP
      '_TZE284_', // Most TZE284 devices use DP
    ];

    const requires = requiresTuyaDP.some(pattern =>
      manufacturerName.toUpperCase().includes(pattern.toUpperCase())
    );

    if (requires) {
      this.log(`[PROTOCOL-ROUTER] Manufacturer ${manufacturerName} typically uses Tuya DP`);
    }

    return requires;
  }

  /**
   * Check if device should prefer Tuya DP over native Zigbee
   * @param {ZCLNode} zclNode - Zigbee node
   * @param {string} manufacturerName - Manufacturer name
   * @returns {boolean} True if should prefer DP
   */
  shouldPreferTuyaDP(zclNode, manufacturerName) {
    // If it's a multi-gang switch with Tuya cluster, prefer DP
    const driverId = this.device.driver?.id || '';
    const isMultiGang = /(\d)gang/.test(driverId);

    if (isMultiGang && this.hasTuyaCluster) {
      this.log('[PROTOCOL-ROUTER] Multi-gang switch with Tuya cluster → prefer DP');
      return true;
    }

    // If it's a TS0601 device (pure Tuya), must use DP
    const endpoint = zclNode?.endpoints?.[1];
    if (endpoint?.clusters?.basic) {
      // Check model ID via getData() or stored data
      const deviceData = this.device.getData?.() || {};
      const modelId = deviceData.modelId || '';

      if (modelId === 'TS0601') {
        this.log('[PROTOCOL-ROUTER] TS0601 device → MUST use DP (no standard clusters)');
        return true;
      }
    }

    return false;
  }

  /**
   * Get current protocol
   * @returns {string} 'TUYA_DP' or 'ZIGBEE_NATIVE'
   */
  getProtocol() {
    return this.protocol || 'ZIGBEE_NATIVE';
  }

  /**
   * Check if using Tuya DP protocol
   * @returns {boolean} True if using Tuya DP
   */
  isUsingTuyaDP() {
    return this.protocol === 'TUYA_DP';
  }

  /**
   * Check if using native Zigbee
   * @returns {boolean} True if using native Zigbee
   */
  isUsingNativeZigbee() {
    return this.protocol === 'ZIGBEE_NATIVE';
  }

  /**
   * Route setOn command to appropriate protocol
   * @param {number} endpoint - Endpoint number (for multi-endpoint devices)
   * @param {object} options - Additional options
   */
  async setOn(endpoint = 1, options = {}) {
    if (this.isUsingTuyaDP()) {
      return await this.setOnViaTuyaDP(endpoint, options);
    } else {
      return await this.setOnViaZigbee(endpoint, options);
    }
  }

  /**
   * Route setOff command to appropriate protocol
   * @param {number} endpoint - Endpoint number
   * @param {object} options - Additional options
   */
  async setOff(endpoint = 1, options = {}) {
    if (this.isUsingTuyaDP()) {
      return await this.setOffViaTuyaDP(endpoint, options);
    } else {
      return await this.setOffViaZigbee(endpoint, options);
    }
  }

  /**
   * Route toggle command to appropriate protocol
   * @param {number} endpoint - Endpoint number
   * @param {object} options - Additional options
   */
  async toggle(endpoint = 1, options = {}) {
    if (this.isUsingTuyaDP()) {
      return await this.toggleViaTuyaDP(endpoint, options);
    } else {
      return await this.toggleViaZigbee(endpoint, options);
    }
  }

  // ========================================================================
  // TUYA DP PROTOCOL METHODS
  // ========================================================================

  async setOnViaTuyaDP(endpoint, options) {
    this.log(`[PROTOCOL-ROUTER] 📤 Setting ON via Tuya DP${endpoint}`);

    if (!this.device.tuyaEF00Manager) {
      throw new Error('TuyaEF00Manager not available');
    }

    // DP mapping: DP1=endpoint1, DP2=endpoint2, etc.
    const dp = endpoint;
    await this.device.tuyaEF00Manager.sendTuyaDP(dp, 0x01, true); // Type 0x01 = BOOL

    this.log(`[PROTOCOL-ROUTER] ✅ Sent DP${dp}=true`);
  }

  async setOffViaTuyaDP(endpoint, options) {
    this.log(`[PROTOCOL-ROUTER] 📤 Setting OFF via Tuya DP${endpoint}`);

    if (!this.device.tuyaEF00Manager) {
      throw new Error('TuyaEF00Manager not available');
    }

    const dp = endpoint;
    await this.device.tuyaEF00Manager.sendTuyaDP(dp, 0x01, false);

    this.log(`[PROTOCOL-ROUTER] ✅ Sent DP${dp}=false`);
  }

  async toggleViaTuyaDP(endpoint, options) {
    this.log(`[PROTOCOL-ROUTER] 📤 Toggling via Tuya DP${endpoint}`);

    // Get current state
    const capabilityId = endpoint === 1 ? 'onoff' : `onoff.${endpoint}`;
    const currentState = this.device.getCapabilityValue(capabilityId);

    // Toggle
    if (currentState) {
      await this.setOffViaTuyaDP(endpoint, options);
    } else {
      await this.setOnViaTuyaDP(endpoint, options);
    }
  }

  // ========================================================================
  // NATIVE ZIGBEE PROTOCOL METHODS
  // ========================================================================

  async setOnViaZigbee(endpoint, options) {
    this.log(`[PROTOCOL-ROUTER] 📤 Setting ON via Zigbee endpoint ${endpoint}`);

    const ep = this.device.zclNode?.endpoints?.[endpoint];
    if (!ep || !ep.clusters?.onOff) {
      throw new Error(`Endpoint ${endpoint} or onOff cluster not available`);
    }

    await ep.clusters.onOff.setOn();
    this.log(`[PROTOCOL-ROUTER] ✅ Sent Zigbee ON command to endpoint ${endpoint}`);
  }

  async setOffViaZigbee(endpoint, options) {
    this.log(`[PROTOCOL-ROUTER] 📤 Setting OFF via Zigbee endpoint ${endpoint}`);

    const ep = this.device.zclNode?.endpoints?.[endpoint];
    if (!ep || !ep.clusters?.onOff) {
      throw new Error(`Endpoint ${endpoint} or onOff cluster not available`);
    }

    await ep.clusters.onOff.setOff();
    this.log(`[PROTOCOL-ROUTER] ✅ Sent Zigbee OFF command to endpoint ${endpoint}`);
  }

  async toggleViaZigbee(endpoint, options) {
    this.log(`[PROTOCOL-ROUTER] 📤 Toggling via Zigbee endpoint ${endpoint}`);

    const ep = this.device.zclNode?.endpoints?.[endpoint];
    if (!ep || !ep.clusters?.onOff) {
      throw new Error(`Endpoint ${endpoint} or onOff cluster not available`);
    }

    await ep.clusters.onOff.toggle();
    this.log(`[PROTOCOL-ROUTER] ✅ Sent Zigbee TOGGLE command to endpoint ${endpoint}`);
  }

  /**
   * Get protocol diagnostics for logging
   * v5.7.50: Enhanced with overlay and proprietary cluster info
   * @returns {object} Diagnostic information
   */
  getDiagnostics() {
    const modelId = this._getModelId();
    const mfr = this._getManufacturerName();
    return {
      protocol: this.protocol,
      manufacturerName: mfr,
      modelId,
      hasTuyaCluster: this.hasTuyaCluster,
      isPassiveMode: !!this.isPassiveMode,
      isUsingTuyaDP: this.isUsingTuyaDP(),
      isUsingNativeZigbee: this.isUsingNativeZigbee(),
      hasTuyaManager: !!this.device?.tuyaEF00Manager,
      isBseedDevice: BseedDetector.isBseedDevice(mfr),
      // v5.7.50: New diagnostics
      detectedOverlay: this.detectedOverlay,
      proprietaryClusters: this.proprietaryClusters.map(c => c.name),
      zigbeeVersion: ZigbeeProtocolComplete.detectZigbeeVersion(mfr),
      usesTuyaDP: ZigbeeProtocolComplete.usesTuyaDP(mfr)
    };
  }

  /**
   * v5.7.50: Get all supported protocols
   */
  static getAllSupportedProtocols() {
    return ZigbeeProtocolComplete.getAllProtocols();
  }

  /**
   * v5.7.50: Get manufacturer count
   */
  static getManufacturerCount() {
    return ZigbeeProtocolComplete.getManufacturersCount();
  }
}

// Export with static methods
IntelligentProtocolRouter.ZigbeeProtocolComplete = ZigbeeProtocolComplete;
IntelligentProtocolRouter.BseedDetector = BseedDetector;

module.exports = IntelligentProtocolRouter;
