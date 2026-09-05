'use strict';

/**
 * ProtocolFallbackChain (P102 Homey compensation)
 *
 * Ordered TX/RX strategies with per-step try/catch — never fatal.
 * Complements lib/zigbee/FallbackChains.js (domain remember-path) with a
 * full I/O cascade for incomplete Homey interview / missing cluster methods.
 *
 * Default order (from data/protocol_quirk_table.json):
 *   TX: wrapper_manager → sdk3_direct → quirk_guided → raw_zcl_frame
 *       → magic_handshake_retry → poll_heuristic
 *   RX: capability_listener → zcl_attr_report → tuya_dp_report
 *       → raw_frame_parse → raw_cluster_fallback → poll_heuristic
 */

const DEFAULT_TX_ORDER = Object.freeze([
  'wrapper_manager',
  'sdk3_direct',
  'cluster_command',
  'tuya_bound_cluster',
  'cluster_bind',
  'quirk_guided',
  'raw_zcl_frame',
  'mcu_version_helper',
  'magic_handshake_retry',
  'poll_heuristic',
]);

const DEFAULT_RX_ORDER = Object.freeze([
  'capability_listener',
  'zcl_attr_report',
  'tuya_dp_report',
  'tuya_bound_report',
  'ias_zone',
  'raw_frame_parse',
  'raw_cluster_fallback',
  'cluster_data_query',
  'mcu_report',
  'poll_heuristic',
]);

class ProtocolFallbackChain {
  /**
   * @param {object} device Homey ZigBee device
   * @param {object} [opts]
   * @param {object} [opts.io] DeviceIOFacade instance
   * @param {object} [opts.compensation] HomeyCompensationLayer instance
   * @param {object} [opts.quirkTable] loaded quirk table
   */
  constructor(device, opts = {}) {
    this.device = device;
    this.io = opts.io || device?.io || null;
    this.compensation = opts.compensation || null;
    this.quirkTable = opts.quirkTable || null;
    this.stats = {
      txAttempts: 0,
      txSuccess: 0,
      rxAttempts: 0,
      rxSuccess: 0,
      lastTxVia: null,
      lastRxVia: null,
      errors: 0,
    };
  }

  _log(...args) {
    try {
      (this.device?._boundLog || this.device?.log)?.('[PFC]', ...args);
    } catch (_e) { /* noop */ }
  }

  get txOrder() {
    const fromTable = this.quirkTable?.fallbackOrder?.tx;
    return Array.isArray(fromTable) && fromTable.length ? fromTable : DEFAULT_TX_ORDER;
  }

  get rxOrder() {
    const fromTable = this.quirkTable?.fallbackOrder?.rx;
    return Array.isArray(fromTable) && fromTable.length ? fromTable : DEFAULT_RX_ORDER;
  }

  /**
   * Execute ordered strategies. Each step is try/caught; never throws.
   * @param {'tx'|'rx'} direction
   * @param {Record<string, Function>} strategies name → async () => result|null|false
   * @param {object} [meta]
   * @returns {Promise<{ok:boolean, via:string|null, result?:*, attempts:string[]}>}
   */
  async run(direction, strategies, meta = {}) {
    const order = direction === 'rx' ? this.rxOrder : this.txOrder;
    const attempts = [];
    if (direction === 'rx') {this.stats.rxAttempts++;}
    else {this.stats.txAttempts++;}

    const map = strategies && typeof strategies === 'object' ? strategies : {};
    for (const name of order) {
      const fn = map[name];
      if (typeof fn !== 'function') {
        attempts.push(`${name}:skip`);
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await fn(meta);
        attempts.push(`${name}:ok`);
        if (result === false || result === null || result === undefined) {
          continue;
        }
        if (direction === 'rx') {
          this.stats.rxSuccess++;
          this.stats.lastRxVia = name;
        } else {
          this.stats.txSuccess++;
          this.stats.lastTxVia = name;
        }
        return { ok: true, via: name, result, attempts };
      } catch (err) {
        this.stats.errors++;
        attempts.push(`${name}:err`);
        this._log(`${direction} step ${name} failed:`, err?.message || err);
      }
    }
    return { ok: false, via: null, attempts };
  }

  /**
   * Built-in TX cascade for DP / ZCL / raw using DeviceIOFacade when present.
   * @param {object} intent
   * @param {'dp'|'zcl'|'raw'} intent.kind
   * @param {*} intent.payload
   */
  async transmit(intent = {}) {
    const kind = intent.kind || 'dp';
    const io = this.io || this.device?.io;
    const compensation = this.compensation;

    return this.run('tx', {
      wrapper_manager: async () => {
        if (!io) {return false;}
        if (kind === 'dp') {
          return io.sendDP?.(intent.dp, intent.value, intent.opts || {});
        }
        if (kind === 'zcl') {
          return io.writeZcl?.(intent.ep ?? 1, intent.cluster, intent.attributes || {});
        }
        return false;
      },
      sdk3_direct: async () => {
        if (kind !== 'zcl') {return false;}
        const epId = intent.ep ?? 1;
        const cluster = (this.io?._resolveCluster ? this.io._resolveCluster(epId, intent.cluster) : null)
          || this.device?.zclNode?.endpoints?.[epId]?.clusters?.[intent.cluster]
          || this.device?.zclNode?.endpoints?.[epId]?.clusters?.[String(intent.cluster)];
        if (!cluster || typeof cluster.writeAttributes !== 'function') {return false;}
        await cluster.writeAttributes(intent.attributes || {});
        return true;
      },
      cluster_command: async () => {
        if (!io) {return false;}
        if (kind === 'dp') {
          // WHY: leftover HYBRID-QUERY / EF00 TX on sleepy IAS (1cf775a2)
          if (typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
            return false;
          }
          if (intent.dp != null && typeof io.requestDP === 'function') {
            return io.requestDP(intent.dp, { ...(intent.opts || {}), skipFallback: true });
          }
          if (typeof io._clusterDataQuery === 'function') {
            return io._clusterDataQuery(intent.opts || {});
          }
          if (typeof io.queryAllDPs === 'function') {
            return io.queryAllDPs({ ...(intent.opts || {}), skipFallback: true });
          }
        }
        if (kind === 'zcl' && typeof io.writeZcl === 'function') {
          return io.writeZcl(intent.ep ?? 1, intent.cluster, intent.attributes || {});
        }
        return false;
      },
      tuya_bound_cluster: async () => {
        if (!io || typeof io.sendRaw !== 'function') {return false;}
        const boundIds = intent.boundClusters || [0xE000, 0xE001, 0xE002];
        const payload = intent.rawPayload || intent.payload;
        if (!payload && intent.dp == null) {return false;}
        for (const cid of boundIds) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const ok = await io.sendRaw(cid, payload || Buffer.alloc(0), intent.opts || {});
            if (ok) {return { via: 'tuya_bound', cluster: cid };}
          } catch (_e) { /* next */ }
        }
        return false;
      },
      cluster_bind: async () => {
        if (!io || typeof io.bindCluster !== 'function') {return false;}
        const clusters = intent.bindClusters
          || (intent.cluster != null ? [intent.cluster] : [0xEF00, 0xE000, 0x0006]);
        let any = false;
        for (const c of clusters) {
          try {
            // eslint-disable-next-line no-await-in-loop
            if (await io.bindCluster(intent.ep ?? 1, c)) {any = true;}
          } catch (_e) { /* next */ }
        }
        return any ? { via: 'cluster_bind', clusters } : false;
      },
      quirk_guided: async () => {
        if (!compensation || typeof compensation.applyInitSequence !== 'function') {
          return false;
        }
        if (intent.skipQuirk) {return false;}
        const seqId = intent.initSequence || (kind === 'dp' ? 'tuya_query_all_dps' : null);
        if (!seqId) {return false;}
        if (seqId === 'tuya_query_all_dps'
          && typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        return compensation.applyInitSequence(seqId, intent);
      },
      raw_zcl_frame: async () => {
        if (!io || typeof io.sendRaw !== 'function') {return false;}
        if (kind === 'raw' || intent.rawPayload) {
          return io.sendRaw(
            intent.clusterId ?? intent.cluster ?? 0xEF00,
            intent.rawPayload || intent.payload || Buffer.alloc(0),
            intent.opts || {},
          );
        }
        return false;
      },
      mcu_version_helper: async () => {
        if (kind !== 'dp' && kind !== 'raw') {return false;}
        if (typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        try {
          const { configureMcuVersionRequest } = require('../tuya/MCUVersionHelper');
          const { findTuyaCluster } = require('../tuya/MagicPacketRegistry');
          const cluster = findTuyaCluster(this.device, this.device?.zclNode);
          if (!cluster) {return false;}
          return !!(await configureMcuVersionRequest(this.device, cluster, intent.opts || {}));
        } catch (_e) {
          return false;
        }
      },
      magic_handshake_retry: async () => {
        if (!io || typeof io.magicHandshake !== 'function') {return false;}
        if (typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        const ok = await io.magicHandshake(intent.opts || {});
        if (!ok) {return false;}
        // After magic, one soft DP query if possible
        if (kind === 'dp' && typeof io.queryAllDPs === 'function') {
          await io.queryAllDPs(intent.opts || {}).catch(() => false);
        }
        return ok;
      },
      poll_heuristic: async () => {
        if (!io) {return false;}
        if (kind === 'dp' && typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        if (kind === 'dp' && typeof io.requestDP === 'function' && intent.dp != null) {
          return io.requestDP(intent.dp, intent.opts || {});
        }
        if (kind === 'zcl' && typeof io.readZcl === 'function') {
          const attrs = intent.readAttrs || Object.keys(intent.attributes || {});
          if (!attrs.length) {return false;}
          const val = await io.readZcl(intent.ep ?? 1, intent.cluster, attrs);
          return val != null ? val : false;
        }
        return false;
      },
    }, intent);
  }

  /**
   * Built-in RX cascade — prefer already-delivered values, then query paths.
   */
  async receive(intent = {}) {
    const io = this.io || this.device?.io;
    const kind = intent.kind || 'auto';

    return this.run('rx', {
      capability_listener: async () => {
        const cap = intent.capability;
        if (!cap || typeof this.device?.getCapabilityValue !== 'function') {return false;}
        try {
          const v = this.device.getCapabilityValue(cap);
          if (v === null || v === undefined) {return false;}
          return { source: 'capability', value: v };
        } catch (_e) {
          return false;
        }
      },
      zcl_attr_report: async () => {
        if (!io || typeof io.readZcl !== 'function') {return false;}
        if (kind === 'dp') {return false;}
        if (intent.cluster == null || !intent.attrs) {return false;}
        const val = await io.readZcl(intent.ep ?? 1, intent.cluster, intent.attrs);
        return val != null ? { source: 'zcl', value: val } : false;
      },
      tuya_dp_report: async () => {
        if (!io) {return false;}
        if (intent.dp == null) {return false;}
        if (typeof io.requestDP === 'function') {
          const ok = await io.requestDP(intent.dp, intent.opts || {});
          return ok ? { source: 'tuya_dp', requested: intent.dp } : false;
        }
        return false;
      },
      tuya_bound_report: async () => {
        if (!io || typeof io.readZcl !== 'function') {return false;}
        const bound = intent.boundCluster || 0xE000;
        try {
          const val = await io.readZcl(intent.ep ?? 1, bound, intent.attrs || ['data']);
          return val != null ? { source: 'tuya_bound', value: val } : false;
        } catch (_e) {
          return false;
        }
      },
      ias_zone: async () => {
        if (!io || typeof io.readZcl !== 'function') {return false;}
        if (kind === 'dp') {return false;}
        try {
          const val = await io.readZcl(intent.ep ?? 1, 0x0500, intent.attrs || ['zoneStatus']);
          return val != null ? { source: 'ias', value: val } : false;
        } catch (_e) {
          return false;
        }
      },
      raw_frame_parse: async () => {
        const ef00 = this.device?.tuyaEF00Manager;
        if (!ef00 || !intent.frame) {return false;}
        // P110: parseIncomingFrame never existed — use parseTuyaFrame / handleDatapoint
        const frame = intent.frame;
        if (typeof ef00.parseTuyaFrame === 'function') {
          const buf = Buffer.isBuffer(frame?.data) ? frame.data
            : (Buffer.isBuffer(frame) ? frame : null);
          if (buf) {
            const parsed = ef00.parseTuyaFrame(buf);
            return parsed != null ? { source: 'raw_frame', value: parsed } : false;
          }
        }
        if (typeof ef00.handleDatapoint === 'function' && (frame?.dp != null || frame?.datapoint != null)) {
          await ef00.handleDatapoint(frame);
          return { source: 'raw_frame', value: frame };
        }
        return false;
      },
      raw_cluster_fallback: async () => {
        const raw = this.device?.rawClusterFallback || io?._rawFallback;
        if (!raw || typeof raw.initialize !== 'function') {return false;}
        if (intent.skipInit) {return false;}
        await raw.initialize(this.device.zclNode);
        return { source: 'raw_cluster_fallback', initialized: true };
      },
      cluster_data_query: async () => {
        if (!io) {return false;}
        if (typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        if (typeof io._clusterDataQuery === 'function') {
          const ok = await io._clusterDataQuery({
            ...(intent.opts || {}),
            dp: intent.dp,
          });
          return ok ? { source: 'cluster_data_query', dp: intent.dp } : false;
        }
        return false;
      },
      mcu_report: async () => {
        if (!io) {return false;}
        if (typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        if (typeof io.queryAllDPs === 'function') {
          const ok = await io.queryAllDPs({ ...(intent.opts || {}), soft: true });
          return ok ? { source: 'mcu_query_all' } : false;
        }
        return false;
      },
      poll_heuristic: async () => {
        if (!io || typeof io.queryAllDPs !== 'function') {return false;}
        if (typeof io.shouldSkipIasOnlyEf00Tx === 'function' && io.shouldSkipIasOnlyEf00Tx()) {
          return false;
        }
        const ok = await io.queryAllDPs(intent.opts || {});
        return ok ? { source: 'poll_query_all' } : false;
      },
    }, intent);
  }

  getStats() {
    return { ...this.stats, txOrder: [...this.txOrder], rxOrder: [...this.rxOrder] };
  }
}

module.exports = ProtocolFallbackChain;
module.exports.ProtocolFallbackChain = ProtocolFallbackChain;
module.exports.DEFAULT_TX_ORDER = DEFAULT_TX_ORDER;
module.exports.DEFAULT_RX_ORDER = DEFAULT_RX_ORDER;
