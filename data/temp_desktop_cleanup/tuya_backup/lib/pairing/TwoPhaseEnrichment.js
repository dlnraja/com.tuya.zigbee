'use strict';

/**
 * TwoPhaseEnrichment - 2-phase pairing for Tuya devices
 * Phase 1: Accept device (minimal matching)
 * Phase 2: Post-pairing enrichment
 * @version 5.5.670
 */

const TuyaTimeSyncEngine = require('./TuyaTimeSyncEngine');
const EventDeduplicator = require('./EventDeduplicator');
const DynamicEndpointDiscovery = require('./DynamicEndpointDiscovery');

class TwoPhaseEnrichment {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._enrichmentComplete = false;
    this._timeSyncEngine = new TuyaTimeSyncEngine(device);
    this._eventDedup = new EventDeduplicator(device);
    this._endpointDiscovery = new DynamicEndpointDiscovery(device);
  }

  async phase1(zclNode) {
    this.log('[P1] Starting minimal pairing...');
    try {
      const funcEp = this._endpointDiscovery.findFunctional(zclNode);
      const protocol = this._detectProtocol(zclNode);
      
      await this.device.setStoreValue('functional_endpoint', funcEp);
      await this.device.setStoreValue('protocol_type', protocol);
      await this.device.setStoreValue('pairing_phase', 1);
      
      this.device.setAvailable();
      this.log(`[P1] ✅ Device accepted (EP:${funcEp}, Protocol:${protocol})`);
      
      // Schedule phase 2
      setTimeout(() => this.phase2(zclNode), 3000);
      return { success: true, endpoint: funcEp, protocol };
    } catch (e) {
      this.log('[P1] Error:', e.message);
      this.device.setAvailable();
      return { success: false };
    }
  }

  async phase2(zclNode) {
    this.log('[P2] Starting enrichment...');
    try {
      // Time sync (critical for sensors)
      await this._timeSyncEngine.syncTime(zclNode);
      
      // Discover all endpoints
      const eps = await this._endpointDiscovery.discover(zclNode);
      
      // Try to bind IAS Zone if present
      await this._bindIASZone(zclNode);
      
      // Configure reporting
      await this._configureReporting(zclNode);
      
      await this.device.setStoreValue('pairing_phase', 2);
      this._enrichmentComplete = true;
      this.log('[P2] ✅ Enrichment complete');
      return { success: true };
    } catch (e) {
      this.log('[P2] Error:', e.message);
      // Retry after delay
      setTimeout(() => this.phase2(zclNode), 10000);
      return { success: false };
    }
  }

  _detectProtocol(zclNode) {
    const ep = zclNode?.endpoints?.[1] || Object.values(zclNode?.endpoints || {})[0];
    if (!ep) return 'unknown';
    const c = ep.clusters || {};
    if (c[61184] || c.tuya) return c.onOff ? 'hybrid' : 'tuya_dp';
    return 'zcl';
  }

  async _bindIASZone(zclNode) {
    try {
      for (const [id, ep] of Object.entries(zclNode?.endpoints || {})) {
        const ias = ep.clusters?.iasZone || ep.clusters?.[1280];
        if (ias?.bind) {
          await ias.bind();
          this.log(`[P2] IAS Zone bound on EP${id}`);
        }
      }
    } catch (e) { /* silent */ }
  }

  async _configureReporting(zclNode) {
    // Minimal reporting config
  }

  get eventDeduplicator() { return this._eventDedup; }
  get isEnriched() { return this._enrichmentComplete; }
}

module.exports = TwoPhaseEnrichment;
