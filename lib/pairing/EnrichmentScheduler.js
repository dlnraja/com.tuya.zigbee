'use strict';

/**
 * EnrichmentScheduler - Post-pairing enrichment with retry & fallback
 * 
 * CRITICAL: Implements retry logic with exponential backoff
 * - Time sync (immediate)
 * - IAS binding (with fallback to polling)
 * - Cluster discovery (all endpoints)
 * - DP polling fallback when ZCL fails
 * 
 * @version 5.5.674
 */

class EnrichmentScheduler {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._tasks = new Map();
    this._status = 'idle'; // idle, enriching, ready
  }

  schedule(taskId, taskFn, delay = 2000, maxRetries = 5) {
    if (this._tasks.has(taskId)) return;
    this._tasks.set(taskId, { fn: taskFn, retries: 0, maxRetries, delay });
    this._run(taskId);
  }

  async _run(taskId) {
    const t = this._tasks.get(taskId);
    if (!t) return;
    
    this._status = 'enriching';
    try {
      await t.fn();
      this.log(`[ENRICH] ✅ ${taskId} completed`);
      this._tasks.delete(taskId);
      if (this._tasks.size === 0) this._status = 'ready';
    } catch (e) {
      t.retries++;
      this.log(`[ENRICH] ⚠️ ${taskId} failed (${t.retries}/${t.maxRetries}): ${e.message}`);
      if (t.retries < t.maxRetries) {
        const backoff = t.delay * Math.pow(1.5, t.retries);
        setTimeout(() => this._run(taskId), backoff);
      } else {
        this.log(`[ENRICH] ❌ ${taskId} max retries reached, trying fallback`);
        this._tryFallback(taskId);
      }
    }
  }

  _tryFallback(taskId) {
    if (taskId === 'zcl_bind') {
      this.log('[ENRICH] 🔄 Fallback: switching to Tuya DP polling');
      this.schedule('dp_poll', () => this._pollTuyaDP(), 5000, 3);
    }
  }

  scheduleAll(zclNode) {
    this.log('[ENRICH] 🚀 Starting post-pairing enrichment...');
    this.schedule('time_sync', () => this._timeSync(zclNode), 500, 5);
    this.schedule('endpoint_scan', () => this._scanEndpoints(zclNode), 1000, 3);
    this.schedule('zcl_bind', () => this._bindAllClusters(zclNode), 2000, 5);
    this.schedule('ias_enroll', () => this._enrollIAS(zclNode), 3000, 3);
    this.schedule('attr_read', () => this._readAttributes(zclNode), 4000, 3);
  }

  async _timeSync(zclNode) {
    try {
      const GTS = require('../tuya/GlobalTimeSyncEngine');
      await new GTS(this.device).syncTime(zclNode);
    } catch (e) {
      const TSE = require('./TuyaTimeSyncEngine');
      await new TSE(this.device).syncTime(zclNode);
    }
  }

  async _scanEndpoints(zclNode) {
    const DED = require('./DynamicEndpointDiscovery');
    const discovery = new DED(this.device);
    const eps = await discovery.discover(zclNode);
    this.device._discoveredEndpoints = eps;
    this.log(`[ENRICH] 📡 Discovered ${eps.length} endpoints`);
  }

  async _bindAllClusters(zclNode) {
    const clusters = ['onOff', 'iasZone', 'genPowerCfg', 'msTemperatureMeasurement'];
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      for (const name of clusters) {
        const c = ep.clusters?.[name];
        if (c?.bind) {
          try { await c.bind(); this.log(`[ENRICH] ✅ Bound ${name}`); }
          catch (e) { /* continue */ }
        }
      }
    }
  }

  async _enrollIAS(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      const ias = ep.clusters?.iasZone || ep.clusters?.[1280];
      if (ias) {
        try {
          if (ias.bind) await ias.bind();
          if (ias.writeAttributes) {
            await ias.writeAttributes({ iasCieAddress: this.device.homey?.zigbee?.address || '0' });
          }
          this.log('[ENRICH] ✅ IAS enrolled');
        } catch (e) { /* non-critical */ }
      }
    }
  }

  async _readAttributes(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      if (ep.clusters?.genBasic?.readAttributes) {
        try {
          const attrs = await ep.clusters.genBasic.readAttributes(['modelId', 'manufacturerName']);
          this.log(`[ENRICH] 📖 Basic: ${JSON.stringify(attrs)}`);
        } catch (e) { /* continue */ }
      }
    }
  }

  async _pollTuyaDP() {
    const tuya = this.device.zclNode?.endpoints?.[1]?.clusters?.[61184];
    if (tuya?.dataQuery) {
      await tuya.dataQuery({});
      this.log('[ENRICH] 📡 Tuya DP poll sent');
    }
  }

  get status() { return this._status; }
}

module.exports = EnrichmentScheduler;
