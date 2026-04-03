'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');
const TuyaDataPointEngine = require('./TuyaDataPointEngine');

/**
 * TuyaSpecificDevice - Base pour devices Tuya DP
 *
 * INSPIRÉ DE: Johan Bendz Zigbee apps + Homey SDK3 best practices
 *
 * Gère INTELLIGEMMENT:
 * - Tuya DataPoint protocol (cluster 0xEF00)
 * - Standard Zigbee clusters (fallback)
 * - Auto-détection du protocole
 * - Battery reporting intelligent
 */
class TuyaSpecificDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    this.log('════════════════════════════════════════════════════════════════');
    this.log('[TUYA-SPECIFIC] 🔧 Tuya-Specific Device initializing...');
    this.log('════════════════════════════════════════════════════════════════');

    // Initialize base (power detection, dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Detect Tuya DP support
    await this.detectTuyaDPSupport();

    // Setup based on protocol
    if (this.isTuyaDP) {
      this.log('[TUYA-SPECIFIC] 🔶 Tuya DP protocol detected');
      await this.setupTuyaDataPoints();
    } else {
      this.log('[TUYA-SPECIFIC] 📡 Standard Zigbee protocol detected');
      // BaseHybridDevice handles standard Zigbee automatically
    }

    this.log('[TUYA-SPECIFIC] ✅ Initialized!');
    this.log('[TUYA-SPECIFIC] Protocol:', this.isTuyaDP ? 'Tuya DP' : 'Standard Zigbee');
    this.log('[TUYA-SPECIFIC] Power:', this.powerType || 'unknown');
    this.log('════════════════════════════════════════════════════════════════');
  }

  /**
   * Detect Tuya DP support
   */
  async detectTuyaDPSupport() {
    this.log('[TUYA-SPECIFIC] 🔍 Detecting Tuya DP support...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint) {
      this.log('[TUYA-SPECIFIC] ⚠️  Endpoint 1 not found');
      this.isTuyaDP = false;
      return;
    }

    // Check for Tuya cluster (0xEF00)
    const tuyaCluster = endpoint.clusters.manuSpecificTuya
      || endpoint.clusters.tuyaSpecific
      || endpoint.clusters['0xEF00']
      || endpoint.clusters[61184];

    if (tuyaCluster) {
      this.log('[TUYA-SPECIFIC] ✅ Tuya cluster (0xEF00) found');
      this.isTuyaDP = true;
      this.tuyaCluster = tuyaCluster;
    } else {
      this.log('[TUYA-SPECIFIC] ⚠️  No Tuya cluster, using standard Zigbee');
      this.isTuyaDP = false;
    }
  }

  /**
   * Setup Tuya DataPoints
   */
  async setupTuyaDataPoints() {
    this.log('[TUYA-SPECIFIC] 🔧 Setting up Tuya DataPoints...');

    if (!this.tuyaCluster) {
      this.error('[TUYA-SPECIFIC] ❌ No Tuya cluster available!');
      return;
    }

    // Initialize DP engine
    this.dpEngine = new TuyaDataPointEngine(this, this.tuyaCluster);

    // Get DP mapping from child class
    const dpMapping = this.dpMapping || {};
    this.log('[TUYA-SPECIFIC] 📋 DP Mapping:', JSON.stringify(dpMapping, null, 2));

    // Setup DP listeners
    await this.dpEngine.setupDataPoints(dpMapping);

    this.log('[TUYA-SPECIFIC] ✅ Tuya DataPoints configured');
  }

  /**
   * Send DataPoint command
   */
  async sendDataPoint(dpId, dataType, value) {
    if (!this.dpEngine) {
      throw new Error('DP Engine not initialized');
    }

    return this.dpEngine.writeDataPoint(dpId, value, dataType);
  }

  /**
   * Get cached DP value
   */
  getDataPoint(dpId) {
    if (!this.dpEngine) {
      return null;
    }

    return this.dpEngine.getDataPoint(dpId);
  }

  /**
   * Override in child class to provide DP mapping
   *
   * Example:
   * get dpMapping() {
   *   return {
   *     measure_temperature: { dp: 1, parser: v => v / 10 },
   *     measure_humidity: { dp: 2 },
   *     alarm_motion: { dp: 3, parser: v => v === 'active' }
   *   };
   * }
   */
  get dpMapping() {
    return {};
  }
}

module.exports = TuyaSpecificDevice;
