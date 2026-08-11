'use strict';

/**
 * HomeyCompensationLayer (P102 Phase 2)
 *
 * Compensates incomplete Homey interview / SDK cluster coverage:
 * - EF00 missing after interview → magic + soft bind/listen / passive RX
 * - Missing cluster methods → safe stubs
 * - Flow card getters missing on SDK → noop stubs
 * - configureReporting ignored → sleepy-safe poll fallback
 * - MCU version negotiate via TuyaMCUManager + time-format guess
 *
 * Never invents manufacturerNames into compose. Never throws fatal.
 */

const fs = require('fs');
const path = require('path');
const { safeSetInterval, safeClearInterval } = require('../utils/safe-timers');

let TuyaMCUManager;
try {
  TuyaMCUManager = require('../tuya/TuyaMCUManager');
} catch (_e) {
  TuyaMCUManager = null;
}

let TuyaTimeSyncFormats;
try {
  TuyaTimeSyncFormats = require('../tuya/TuyaTimeSyncFormats');
} catch (_e) {
  TuyaTimeSyncFormats = null;
}

const EF00_ALIASES = ['tuya', 'tuyaManufacturer', 'manuSpecificTuya', 0xEF00, 61184];
const CLUSTER_ALIASES = {
  0xEF00: EF00_ALIASES,
  61184: EF00_ALIASES,
  tuya: EF00_ALIASES,
};

let _quirkTableCache = null;

function loadProtocolQuirkTable() {
  if (_quirkTableCache) {return _quirkTableCache;}
  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'protocol_quirk_table.json'),
    path.join(__dirname, '..', '..', '.github', 'state', 'protocol_quirk_table.json'),
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) {continue;}
      const buf = fs.readFileSync(p); // Buffer → JSON.parse (RAM-safe)
      _quirkTableCache = JSON.parse(buf);
      return _quirkTableCache;
    } catch (_e) { /* try next */ }
  }
  _quirkTableCache = {
    fallbackOrder: {
      tx: ['wrapper_manager', 'sdk3_direct', 'quirk_guided', 'raw_zcl_frame', 'magic_handshake_retry', 'poll_heuristic'],
      rx: ['capability_listener', 'zcl_attr_report', 'tuya_dp_report', 'raw_frame_parse', 'raw_cluster_fallback', 'poll_heuristic'],
    },
    quirks: {},
  };
  return _quirkTableCache;
}

const NOOP_CARD = {
  registerRunListener() { return this; },
  registerArgumentAutocompleteListener() { return this; },
  register() { return this; },
  async trigger() { return false; },
  async getValue() { return false; },
};

function safeGetFlowCard(homey, id, type = 'action') {
  try {
    const flow = homey?.flow;
    if (!flow) {return NOOP_CARD;}
    const methods = type === 'trigger'
      ? ['getDeviceTriggerCard', 'getTriggerCard']
      : type === 'condition'
        ? ['getDeviceConditionCard', 'getConditionCard']
        : ['getActionCard', 'getDeviceActionCard'];
    for (const m of methods) {
      if (typeof flow[m] !== 'function') {continue;}
      try {
        const card = flow[m](id);
        if (card) {return card;}
      } catch (_e) { /* try next */ }
    }
    return NOOP_CARD;
  } catch (_e) {
    return NOOP_CARD;
  }
}

function installFlowCardStubs(homeyOrDriver) {
  try {
    const flow = homeyOrDriver?.flow || homeyOrDriver?.homey?.flow;
    if (!flow) {return false;}
    for (const m of [
      'getActionCard', 'getDeviceActionCard',
      'getTriggerCard', 'getDeviceTriggerCard',
      'getConditionCard', 'getDeviceConditionCard',
    ]) {
      if (typeof flow[m] === 'function') {continue;}
      try {
        flow[m] = (id) => {
          try {
            (homeyOrDriver.log || console.log)?.('[FLOW-STUB]', m, id);
          } catch (_e) { /* noop */ }
          return NOOP_CARD;
        };
      } catch (_e) { /* non-writable */ }
    }
    return true;
  } catch (_e) {
    return false;
  }
}

class HomeyCompensationLayer {
  constructor(device, opts = {}) {
    this.device = device;
    this.io = opts.io || device?.io || null;
    this.quirkTable = opts.quirkTable || loadProtocolQuirkTable();
    this._pollTimers = new Map();
    this._mcu = null;
    this._interviewMiss = [];
  }

  _log(...args) {
    try {
      (this.device?._boundLog || this.device?.log)?.('[HomeyCompensate]', ...args);
    } catch (_e) { /* noop */ }
  }

  findTuyaCluster(zclNode, endpointIds = [1, 2]) {
    const node = zclNode || this.device?.zclNode;
    if (!node?.endpoints) {return null;}
    for (const epId of endpointIds) {
      const ep = node.endpoints[epId];
      if (!ep?.clusters) {continue;}
      for (const key of EF00_ALIASES) {
        const c = ep.clusters[key];
        if (c) {return { endpointId: epId, cluster: c, key };}
      }
    }
    return null;
  }

  /**
   * Resolve cluster by id/name with alias map (interview miss compensation).
   */
  resolveCluster(clusterId, endpointId = 1) {
    try {
      const ep = this.device?.zclNode?.endpoints?.[endpointId];
      if (!ep?.clusters) {return null;}
      const aliases = CLUSTER_ALIASES[clusterId] || [clusterId];
      for (const key of aliases) {
        const c = ep.clusters[key];
        if (c) {return { endpointId, cluster: c, key };}
      }
      return null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Stub missing methods on a cluster so callers don't throw.
   */
  stubMissingClusterMethods(cluster, meta = {}) {
    try {
      if (!cluster || typeof cluster !== 'object') {return false;}
      const stubs = ['bind', 'configureReporting', 'readAttributes', 'writeAttributes'];
      for (const name of stubs) {
        if (typeof cluster[name] === 'function') {continue;}
        try {
          cluster[name] = async () => {
            this._log(`stub ${name} on cluster`, meta.clusterId, 'ep', meta.epId);
            return name === 'readAttributes' ? {} : undefined;
          };
        } catch (_e) { /* frozen */ }
      }
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Record interview misses (expected clusters not present).
   */
  compensateInterviewMiss(zclNode, opts = {}) {
    try {
      const node = zclNode || this.device?.zclNode;
      const extra = opts.extraClusters || [0xEF00];
      this._interviewMiss = [];
      for (const cid of extra) {
        const found = this.resolveCluster(cid, opts.endpoint ?? 1)
          || this.findTuyaCluster(node);
        if (!found) {
          this._interviewMiss.push(cid);
        }
      }
      if (this._interviewMiss.length) {
        this._log('interview miss clusters:', this._interviewMiss.join(','));
        try {
          this.device.setStoreValue?.('interview_miss_clusters', this._interviewMiss).catch(() => {});
        } catch (_e) { /* noop */ }
      }
      return { misses: [...this._interviewMiss] };
    } catch (err) {
      this._log('compensateInterviewMiss failed:', err?.message || err);
      return { misses: [] };
    }
  }

  installFlowCompensation(homeyOrDriver) {
    return installFlowCardStubs(homeyOrDriver || this.device?.homey || this.device?.driver);
  }

  /**
   * Full attach: interview miss + flow stubs + optional MCU negotiate.
   */
  async attach(zclNode, opts = {}) {
    try {
      const miss = this.compensateInterviewMiss(zclNode, opts);
      this.installFlowCompensation(this.device?.homey);
      let mcu = false;
      if (opts.negotiateMcu !== false && miss.misses?.length === 0) {
        mcu = await this.negotiateMcu(opts).catch(() => false);
      }
      if (miss.misses?.includes(0xEF00) || miss.misses?.includes(61184)) {
        await this.ensureTuyaClusterCompensated(opts).catch(() => false);
      }
      return { ok: true, ...miss, mcu };
    } catch (err) {
      this._log('attach failed:', err?.message || err);
      return { ok: false, error: err?.message };
    }
  }

  async ensureTuyaClusterCompensated(opts = {}) {
    try {
      const io = this.io || this.device?.io;
      let found = this.findTuyaCluster(this.device?.zclNode, opts.endpoints || [1, 2]);
      if (found) {
        this.stubMissingClusterMethods(found.cluster, { clusterId: 0xEF00, epId: found.endpointId });
        this.device._tuyaClusterEnsured = true;
        return true;
      }

      if (io && typeof io.magicHandshake === 'function' && opts.skipMagic !== true) {
        await io.magicHandshake({ ...opts, rescan: false }).catch(() => false);
      }

      await new Promise((r) => {
        try {
          const h = this.device?.homey;
          if (h && typeof h.setTimeout === 'function') {
            h.setTimeout(r, opts.rescanDelayMs || 1500);
          } else {
            setTimeout(r, opts.rescanDelayMs || 1500);
          }
        } catch (_e) {
          setTimeout(r, opts.rescanDelayMs || 1500);
        }
      });

      found = this.findTuyaCluster(this.device?.zclNode, opts.endpoints || [1, 2]);
      if (found) {
        try {
          if (typeof found.cluster.bind === 'function') {
            await found.cluster.bind().catch(() => {});
          }
        } catch (_e) { /* noop */ }
        this.stubMissingClusterMethods(found.cluster, { clusterId: 0xEF00, epId: found.endpointId });
        this.device._tuyaClusterEnsured = true;
        this._log(`EF00 available after compensation on ep ${found.endpointId}`);
        return true;
      }

      this._log('EF00 still absent after magic+rescan (Homey interview miss)');
      return false;
    } catch (err) {
      this._log('ensureTuyaClusterCompensated failed:', err?.message || err);
      return false;
    }
  }

  async negotiateMcu(opts = {}) {
    try {
      if (!TuyaMCUManager) {
        this._log('TuyaMCUManager unavailable');
        return false;
      }
      this._mcu = this._mcu || new TuyaMCUManager(this.device);
      this.device._tuyaMcuManager = this._mcu;
      const version = await this._mcu.negotiateVersion(opts).catch(() => null);
      if (TuyaTimeSyncFormats?.guessFormat) {
        const mfr = this.device.getSetting?.('zb_manufacturer_name') || '';
        const pid = this.device.getSetting?.('zb_model_id') || '';
        const format = TuyaTimeSyncFormats.guessFormat({
          manufacturerName: mfr,
          productId: pid,
          mcuVersion: version || this._mcu.mcuVersion,
        });
        this.device._tuyaTimeFormatGuess = format;
        this._log('MCU time format guess:', format);
      }
      return !!version || this._mcu.mcuVersion !== 'unknown';
    } catch (err) {
      this._log('negotiateMcu failed:', err?.message || err);
      return false;
    }
  }

  startReportingPollFallback(key, fn, intervalMs = 300000) {
    try {
      this.stopReportingPollFallback(key);
      if (typeof fn !== 'function') {return false;}
      const timer = safeSetInterval(this.device, () => {
        Promise.resolve(fn()).catch((e) => this._log('poll fallback', key, e?.message || e));
      }, Math.max(60000, intervalMs));
      if (timer) {
        this._pollTimers.set(key, timer);
        this._log(`poll fallback started: ${key} @ ${intervalMs}ms`);
        return true;
      }
      return false;
    } catch (err) {
      this._log('startReportingPollFallback failed:', err?.message || err);
      return false;
    }
  }

  stopReportingPollFallback(key) {
    try {
      const t = this._pollTimers.get(key);
      if (t) {
        safeClearInterval(this.device, t);
        this._pollTimers.delete(key);
      }
    } catch (_e) { /* noop */ }
  }

  destroy() {
    for (const key of [...this._pollTimers.keys()]) {
      this.stopReportingPollFallback(key);
    }
  }

  async applyInitSequence(seqId, intent = {}) {
    try {
      const io = this.io || this.device?.io;
      if (seqId === 'tuya_magic_packet' && io?.magicHandshake) {
        return !!(await io.magicHandshake({
          ...(intent.opts || {}),
          force: intent.force === true,
        }));
      }
      if (seqId === 'tuya_query_all_dps' && io?.queryAllDPs) {
        return !!(await io.queryAllDPs(intent.opts || {}));
      }
      if (seqId === 'tuya_ensure_cluster') {
        return this.ensureTuyaClusterCompensated(intent.opts || {});
      }
      if (seqId === 'mcu_negotiate' || seqId === 'tuya_time_sync') {
        return this.negotiateMcu(intent.opts || {});
      }
      if (seqId === 'ias_cie_enroll' && io?.ensureIasEnrolled) {
        return !!(await io.ensureIasEnrolled(intent.opts || {}));
      }
      if ((seqId === 'metering_divisor_fix' || seqId === 'electrical_current_divisor') && io?.readZcl) {
        const cluster = seqId === 'metering_divisor_fix' ? 'metering' : 'electricalMeasurement';
        const attrs = intent.attrs || (seqId === 'metering_divisor_fix' ? [0x0301, 0x0302] : [0x0602, 0x0603]);
        return !!(await io.readZcl(intent.endpoint ?? 1, cluster, attrs));
      }
      return false;
    } catch (err) {
      this._log('applyInitSequence failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Run quirk-table init sequences for this device's mfr/pid (era-enrich P103).
   * Never invents fingerprints; only best-effort protocol wake/query.
   */
  async applyQuirkGuidedInit(opts = {}) {
    const results = { sequences: [], ok: 0 };
    try {
      const mfr = String(
        opts.manufacturerName
        || this.device.getSetting?.('zb_manufacturer_name')
        || this.device.getData?.()?.manufacturerName
        || '',
      ).trim();
      const pid = String(
        opts.productId
        || this.device.getSetting?.('zb_model_id')
        || this.device.getData?.()?.modelId
        || '',
      ).trim();

      const table = this.quirkTable || loadProtocolQuirkTable();
      const seqIds = new Set();

      const mfrEntry = table.mfrQuirks?.[mfr] || table.mfrQuirks?.[mfr.toUpperCase()];
      if (Array.isArray(mfrEntry?.init)) {
        for (const id of mfrEntry.init) { seqIds.add(id); }
      }

      const modelExpect = table.modelExpectedClusters?.[pid];
      if (modelExpect && Array.isArray(table.initSequences?.tuya_magic_packet?.models)
        && table.initSequences.tuya_magic_packet.models.some((m) => String(m).toLowerCase() === pid.toLowerCase())) {
        seqIds.add('tuya_magic_packet');
      }
      if (/^TS0601$/i.test(pid) || /^_TZE/i.test(mfr)) {
        seqIds.add('tuya_magic_packet');
        seqIds.add('tuya_query_all_dps');
      }
      if (/^TS020[235]/i.test(pid) || /^TS021[056]/i.test(pid)) {
        seqIds.add('ias_cie_enroll');
      }

      // Always prefer magic before query-all
      const order = ['tuya_magic_packet', 'tuya_query_all_dps', 'ias_cie_enroll', 'tuya_time_sync', 'metering_divisor_fix', 'electrical_current_divisor'];
      for (const id of order) {
        if (!seqIds.has(id)) { continue; }
        // eslint-disable-next-line no-await-in-loop
        const ok = !!(await this.applyInitSequence(id, { opts, force: opts.forceMagic === true }));
        results.sequences.push({ id, ok });
        if (ok) { results.ok += 1; }
      }

      this.device._quirkGuidedInit = results;
      this._log('quirk-guided init:', JSON.stringify(results.sequences));
      return results;
    } catch (err) {
      this._log('applyQuirkGuidedInit failed:', err?.message || err);
      return results;
    }
  }
}

module.exports = HomeyCompensationLayer;
module.exports.HomeyCompensationLayer = HomeyCompensationLayer;
module.exports.loadProtocolQuirkTable = loadProtocolQuirkTable;
module.exports.safeGetFlowCard = safeGetFlowCard;
module.exports.installFlowCardStubs = installFlowCardStubs;
