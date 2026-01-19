'use strict';

/**
 * EnrichmentScheduler - Post-pairing enrichment with retry
 * @version 5.5.671
 */

class EnrichmentScheduler {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._tasks = new Map();
  }

  schedule(taskId, taskFn, delay = 2000, maxRetries = 5) {
    if (this._tasks.has(taskId)) return;
    this._tasks.set(taskId, { fn: taskFn, retries: 0, maxRetries, delay });
    this._run(taskId);
  }

  async _run(taskId) {
    const t = this._tasks.get(taskId);
    if (!t) return;
    
    try {
      await t.fn();
      this.log(`[SCHED] ✅ ${taskId} done`);
    } catch (e) {
      t.retries++;
      if (t.retries < t.maxRetries) {
        setTimeout(() => this._run(taskId), t.delay * t.retries);
      }
    }
  }

  scheduleAll(zclNode) {
    this.schedule('time_sync', () => this._timeSync(zclNode), 1000);
    this.schedule('ias_bind', () => this._bindIAS(zclNode), 3000);
  }

  async _timeSync(zclNode) {
    const TSE = require('./TuyaTimeSyncEngine');
    await new TSE(this.device).syncTime(zclNode);
  }

  async _bindIAS(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      const ias = ep.clusters?.iasZone || ep.clusters?.[1280];
      if (ias?.bind) await ias.bind();
    }
  }
}

module.exports = EnrichmentScheduler;
