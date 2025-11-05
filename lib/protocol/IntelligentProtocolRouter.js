'use strict';

// const BseedDetector = require('./BseedDetector'); // File not found - integrated inline if needed

/**
 * IntelligentProtocolRouter
 * 
 * Intelligently routes commands between:
 * - Tuya DataPoint (DP) protocol (cluster 0xEF00)
 * - Native Zigbee protocols (standard clusters)
 * 
 * Based on:
 * - Device manufacturer detection (BSEED, etc.)
 * - Cluster availability (EF00 presence)
 * - Firmware behavior patterns
 * - User reports and community feedback
 * 
 * References:
 * - https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard
 * - Loïc Salmona email (BSEED 2-gang issue)
 * - zigpy discussion: https://github.com/zigpy/zigpy/discussions/823
 */

class IntelligentProtocolRouter {
  
  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
    
    this.protocol = null; // Will be set to 'TUYA_DP' or 'ZIGBEE_NATIVE'
    this.manufacturerName = null;
    this.hasTuyaCluster = false;
  }
  
  /**
   * Detect and set the optimal protocol for this device
   * @param {ZCLNode} zclNode - Zigbee node
   * @param {string} manufacturerName - Device manufacturer
   * @returns {string} Selected protocol: 'TUYA_DP' or 'ZIGBEE_NATIVE'
   */
  async detectProtocol(zclNode, manufacturerName) {
    this.log('[PROTOCOL-ROUTER] 🔍 Detecting optimal protocol...');
    this.manufacturerName = manufacturerName;
    
    // Check for Tuya EF00 cluster
    this.hasTuyaCluster = this.checkTuyaCluster(zclNode);
    
    // Check if manufacturer requires Tuya DP
    const requiresTuyaDP = this.checkManufacturerRequirement(manufacturerName);
    
    // Determine protocol
    if (requiresTuyaDP && this.hasTuyaCluster) {
      this.protocol = 'TUYA_DP';
      this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (manufacturer requirement + cluster available)');
    } else if (this.hasTuyaCluster && this.shouldPreferTuyaDP(zclNode, manufacturerName)) {
      this.protocol = 'TUYA_DP';
      this.log('[PROTOCOL-ROUTER] ✅ Selected: TUYA_DP (optimal for this device)');
    } else {
      this.protocol = 'ZIGBEE_NATIVE';
      this.log('[PROTOCOL-ROUTER] ✅ Selected: ZIGBEE_NATIVE (standard Zigbee clusters)');
    }
    
    return this.protocol;
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
   * @returns {object} Diagnostic information
   */
  getDiagnostics() {
    return {
      protocol: this.protocol,
      manufacturerName: this.manufacturerName,
      hasTuyaCluster: this.hasTuyaCluster,
      isUsingTuyaDP: this.isUsingTuyaDP(),
      isUsingNativeZigbee: this.isUsingNativeZigbee(),
      isBseedDevice: BseedDetector.isBseedDevice(this.manufacturerName)
    };
  }
}

module.exports = IntelligentProtocolRouter;
