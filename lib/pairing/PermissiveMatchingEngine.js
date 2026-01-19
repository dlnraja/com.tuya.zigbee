'use strict';

/**
 * PermissiveMatchingEngine - Admission-based pairing
 * 
 * RULE: Pair first, identify later
 * 
 * Matching priority:
 * 1. (manufacturerName + productId) exact match → direct driver
 * 2. manufacturerName alone match → permissive driver
 * 3. NEVER fail pairing due to missing clusters
 * 4. NEVER fallback to generic immediately
 * 
 * v5.5.688: CRITICAL FIX - Case-insensitive matching for manufacturerName/productId
 * Tuya devices report inconsistent casing (_TZE284_vvmbj46n vs _TZE284_VVMBJ46N)
 * 
 * @version 5.5.688
 */

class PermissiveMatchingEngine {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._matchLevel = 'unknown'; // 'exact', 'manufacturer', 'fallback'
    this._enrichmentPending = true;
  }

  /**
   * Determine if device should be accepted by this driver
   * Called during pairing - MUST be permissive
   */
  shouldAcceptDevice(zclNode) {
    const mfr = this._getManufacturerName(zclNode);
    const pid = this._getProductId(zclNode);
    const driverMfrs = this._getDriverManufacturerNames();
    const driverPids = this._getDriverProductIds();
    
    this.log(`[MATCH] Device: ${mfr} / ${pid}`);
    this.log(`[MATCH] Driver has ${driverMfrs.length} mfrs, ${driverPids.length} pids`);

    // v5.5.688: CRITICAL - Case-insensitive matching
    // Tuya devices report inconsistent casing (firmware dependent)
    const mfrLower = (mfr || '').toLowerCase();
    const pidLower = (pid || '').toLowerCase();
    const driverMfrsLower = driverMfrs.map(m => (m || '').toLowerCase());
    const driverPidsLower = driverPids.map(p => (p || '').toLowerCase());

    // Level 1: Exact match (manufacturerName + productId) - CASE INSENSITIVE
    if (driverMfrsLower.includes(mfrLower) && driverPidsLower.includes(pidLower)) {
      this._matchLevel = 'exact';
      this.log('[MATCH] ✅ EXACT match (mfr + pid) [case-insensitive]');
      return { accept: true, level: 'exact', confidence: 100 };
    }

    // Level 2: ManufacturerName match only - CASE INSENSITIVE
    if (driverMfrsLower.includes(mfrLower)) {
      this._matchLevel = 'manufacturer';
      this.log('[MATCH] ✅ MANUFACTURER match (pid may differ) [case-insensitive]');
      return { accept: true, level: 'manufacturer', confidence: 80 };
    }

    // Level 3: ProductId match only (rare but valid) - CASE INSENSITIVE
    if (driverPidsLower.includes(pidLower)) {
      this._matchLevel = 'productId';
      this.log('[MATCH] ⚠️ PRODUCTID only match [case-insensitive]');
      return { accept: true, level: 'productId', confidence: 60 };
    }

    // No match - but DON'T reject immediately
    // Let universal_fallback handle it
    this.log('[MATCH] ❌ No match for this driver');
    return { accept: false, level: 'none', confidence: 0 };
  }

  /**
   * Check if clusters are required (ANSWER: NO at pairing)
   * Clusters are discovered POST-PAIRING
   */
  areClustersRequired() {
    return false; // NEVER require clusters at pairing
  }

  /**
   * Schedule enrichment for later
   * This is where real identification happens
   */
  scheduleEnrichment(zclNode, delayMs = 3000) {
    this.log(`[MATCH] Scheduling enrichment in ${delayMs}ms`);
    
    setTimeout(async () => {
      try {
        await this._runEnrichment(zclNode);
      } catch (err) {
        this.log('[MATCH] Enrichment failed, will retry:', err.message);
        // Retry with exponential backoff
        this.scheduleEnrichment(zclNode, delayMs * 2);
      }
    }, delayMs);
  }

  async _runEnrichment(zclNode) {
    this.log('[ENRICH] Starting post-pairing enrichment...');
    
    // 1. Discover actual clusters
    const clusters = this._discoverClusters(zclNode);
    this.log(`[ENRICH] Found ${clusters.length} clusters`);
    
    // 2. Detect protocol (ZCL, Tuya DP, Hybrid)
    const protocol = this._detectProtocol(clusters);
    this.log(`[ENRICH] Protocol: ${protocol}`);
    
    // 3. Store enrichment data
    await this.device.setStoreValue('enrichment', {
      clusters,
      protocol,
      matchLevel: this._matchLevel,
      enrichedAt: Date.now()
    });
    
    this._enrichmentPending = false;
    this.log('[ENRICH] ✅ Enrichment complete');
  }

  _getManufacturerName(zclNode) {
    return this.device.getSetting?.('zb_manufacturer_name') ||
           zclNode?.manufacturerName || '';
  }

  _getProductId(zclNode) {
    return this.device.getSetting?.('zb_product_id') ||
           zclNode?.modelId || '';
  }

  _getDriverManufacturerNames() {
    return this.device.driver?.manifest?.zigbee?.manufacturerName || [];
  }

  _getDriverProductIds() {
    return this.device.driver?.manifest?.zigbee?.productId || [];
  }

  _discoverClusters(zclNode) {
    const clusters = [];
    const eps = zclNode?.endpoints || {};
    
    for (const [epId, ep] of Object.entries(eps)) {
      if (ep.clusters) {
        clusters.push(...Object.keys(ep.clusters));
      }
    }
    
    return [...new Set(clusters)];
  }

  _detectProtocol(clusters) {
    const hasTuya = clusters.includes('61184') || clusters.includes('tuya');
    const hasOnOff = clusters.includes('6') || clusters.includes('onOff');
    
    if (hasTuya && hasOnOff) return 'hybrid';
    if (hasTuya) return 'tuya_dp';
    return 'zcl';
  }

  get matchLevel() { return this._matchLevel; }
  get isEnrichmentPending() { return this._enrichmentPending; }
}

module.exports = PermissiveMatchingEngine;
