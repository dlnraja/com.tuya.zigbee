'use strict';

/**
 * ProtocolRxTxChain (P208 / P2270)
 *
 * ARCH / SSOT: Function table of every Zigbee/Tuya I/O path Homey may use.
 * ORIGIN: P208 inventory; P2270 adds sleepySafe/cost/needsMagic for CommunicationPathFinder.
 * POURQUOI: Homey interview misses clusters; drivers need the same path catalog for RX/TX redundancy.
 * COMMENT: attach() wraps device.tx/rx; ranking lives in lib/protocol/CommunicationPathFinder.js.
 * POUR QUI: All TuyaZigbeeDevice lineages (BOTH). TIP IA: do not invent parallel path ids.
 *
 * Never throws. Idempotent attach.
 */

/** Canonical path catalog — keep in sync with docs/architecture/LAYERS_* + COMM_PATHFINDING.md */
const PROTOCOL_PATHS = Object.freeze({
  tuya_dp: {
    id: 'tuya_dp', label: 'Tuya DP EF00', tx: true, rx: true,
    clusters: [0xEF00, 61184], sources: ['tuya-dp', 'dp'],
    sleepySafe: false, cost: 2, needsMagic: false, homeyGap: 'leftover_ef00_on_ias',
  },
  zcl: {
    id: 'zcl', label: 'ZCL standard clusters', tx: true, rx: true,
    clusters: null, sources: ['zcl'],
    sleepySafe: true, cost: 1, needsMagic: false, homeyGap: 'unsupported_attr',
  },
  tuya_bound: {
    id: 'tuya_bound', label: 'Tuya bound clusters E000/E001/E002/ED00', tx: true, rx: true,
    clusters: [0xE000, 0xE001, 0xE002, 0xED00, 0xEE00, 0xE004, 0xD001, 0xD010, 0x5000, 0x4000, 0x4001, 0x4002, 0x4003, 0x8000, 0x8001, 0x8002], sources: ['tuya-bound'],
    sleepySafe: true, cost: 2, needsMagic: false, homeyGap: 'e002_attr_scale',
  },
  cluster_bound: {
    id: 'cluster_bound', label: 'Cluster bind + configureReporting', tx: true, rx: true,
    clusters: null, sources: ['cluster-bound'],
    sleepySafe: false, cost: 3, needsMagic: false, homeyGap: 'configure_reporting_0x86',
  },
  raw_frame: {
    id: 'raw_frame', label: 'Raw Zigbee frame / unhandled', tx: true, rx: true,
    clusters: null, sources: ['raw', 'raw_frame'],
    sleepySafe: true, cost: 4, needsMagic: false, homeyGap: 'sdk_unhandled',
  },
  raw_value: {
    id: 'raw_value', label: 'Raw numeric cluster id fallback', tx: true, rx: true,
    clusters: null, sources: ['zcl-raw', 'raw_cluster'],
    sleepySafe: true, cost: 3, needsMagic: false, homeyGap: 'named_cluster_missing',
  },
  mcu: {
    id: 'mcu', label: 'MCU version / time / query_all', tx: true, rx: true,
    clusters: [0xEF00], sources: ['mcu'],
    sleepySafe: false, cost: 3, needsMagic: false, homeyGap: 'time_sync_format',
  },
  ias: {
    id: 'ias', label: 'IAS Zone / ACE', tx: false, rx: true,
    clusters: [0x0500, 0x0501], sources: ['ias'],
    sleepySafe: true, cost: 1, needsMagic: false, homeyGap: 'enroll_on_wake',
  },
  magic: {
    id: 'magic', label: 'Magic handshake / interview wake', tx: true, rx: false,
    clusters: [0xEF00], sources: ['magic'],
    sleepySafe: false, cost: 2, needsMagic: true, homeyGap: 'multi_gang_crosslink',
  },
  ui: {
    id: 'ui', label: 'Homey UI / virtual button', tx: true, rx: false,
    clusters: null, sources: ['ui', 'virtual'],
    sleepySafe: true, cost: 0, needsMagic: false, homeyGap: null,
  },
});

const TUYA_BOUND_IDS = new Set([
  0x4000, 0x4001, 0x4002, 0x4003, 16384, 16385, 16386, 16387,
  0x5000, 20480,
  0x8000, 0x8001, 0x8002, 32768, 32769, 32770,
  0xD001, 53249,
  0xD010, 53264,
  0xE000, 0xE001, 0xE002, 0xED00, 0xEE00, 0xE004,
  57344, 57345, 57346, 60672, 60928, 57348,
]);
const IAS_IDS = new Set([0x0500, 0x0501, 1280, 1281]);
const EF00_IDS = new Set([0xEF00, 61184]);

function classifyCluster(clusterId) {
  if (clusterId == null) {return 'raw_frame';}
  const id = typeof clusterId === 'string' && clusterId.startsWith('0x')
    ? parseInt(clusterId, 16)
    : Number(clusterId);
  if (EF00_IDS.has(id)) {return 'tuya_dp';}
  if (TUYA_BOUND_IDS.has(id)) {return 'tuya_bound';}
  if (IAS_IDS.has(id)) {return 'ias';}
  if (Number.isFinite(id)) {return 'zcl';}
  return 'raw_frame';
}

function sourceForPath(pathId) {
  return PROTOCOL_PATHS[pathId]?.sources?.[0] || pathId || 'unknown';
}

class ProtocolRxTxChain {
  /**
   * @param {object} device
   * @param {object} [opts]
   */
  constructor(device, opts = {}) {
    this.device = device;
    this.io = opts.io || device?.io || null;
    this.stats = {
      tx: Object.create(null),
      rx: Object.create(null),
      lastTx: null,
      lastRx: null,
      errors: 0,
    };
    this._wrapped = false;
  }

  inventory() {
    return Object.values(PROTOCOL_PATHS).map((p) => ({
      ...p,
      txHits: this.stats.tx[p.id] || 0,
      rxHits: this.stats.rx[p.id] || 0,
    }));
  }

  _bump(dir, pathId) {
    const bag = dir === 'tx' ? this.stats.tx : this.stats.rx;
    bag[pathId] = (bag[pathId] || 0) + 1;
    if (dir === 'tx') {this.stats.lastTx = { pathId, at: Date.now() };}
    else {this.stats.lastRx = { pathId, at: Date.now() };}
  }

  _log(...args) {
    try {
      (this.device?._boundLog || this.device?.log)?.('[RX/TX]', ...args);
    } catch (_e) { /* noop */ }
  }

  _resolveIntentTargets(intent) {
    if (!intent || !intent.capability) {return;}
    const cap = String(intent.capability);
    const device = this.device;
    if (!device) {return;}

    // 1. Try to find DP mapping on device
    const dpMaps = [
      device.dpMap,
      device.dpMappings,
      device._dpMap,
      device.tuyaEF00Manager?.dpMappings,
      typeof device._getSensorConfig === 'function' ? device._getSensorConfig()?.dpMap : null,
    ];
    for (const map of dpMaps) {
      if (!map || typeof map !== 'object') {continue;}
      for (const [dpStr, def] of Object.entries(map)) {
        const dp = Number(dpStr);
        if (!Number.isFinite(dp)) {continue;}
        if (def === cap || (def && (def.capability === cap || def.name === cap))) {
          intent.dp = dp;
          intent.kind = intent.kind || 'dp';
          return;
        }
      }
    }

    // 2. Canonical cluster resolutions for standard capabilities
    if (cap === 'onoff' || cap.startsWith('onoff.')) {
      intent.cluster = 0x0006;
      intent.attributes = intent.attributes || { onOff: intent.value ? 1 : 0 };
      intent.kind = intent.kind || 'zcl';
    } else if (cap === 'dim' || cap.startsWith('dim.')) {
      intent.cluster = 0x0008;
      const level = Math.round(Math.max(0, Math.min(1, Number(intent.value) || 0)) * 254);
      intent.attributes = intent.attributes || { currentLevel: level };
      intent.kind = intent.kind || 'zcl';
    } else if (cap === 'windowcoverings_state' || cap === 'windowcoverings_set') {
      intent.cluster = 0x0102;
      intent.kind = intent.kind || 'zcl';
    } else if (cap === 'target_temperature') {
      intent.cluster = 0x0201;
      intent.kind = intent.kind || 'zcl';
    }
  }

  /**
   * Unified TX — enchaîne ProtocolFallbackChain (+ bound/MCU helpers).
   * @param {object} intent
   * @param {string} [intent.kind] dp|zcl|raw|tuya_bound|cluster_bound|mcu|magic|auto
   */
  async transmit(intent = {}) {
    const device = this.device;
    if (!device || device._destroyed) {return { ok: false, reason: 'destroyed' };}

    // Auto-resolve missing DP or Cluster from capability if available
    if (intent.capability && intent.dp == null && intent.cluster == null && !intent.rawPayload) {
      this._resolveIntentTargets(intent);
    }

    let kind = intent.kind || 'auto';
    if (kind === 'auto') {
      if (intent.dp != null) {kind = 'dp';}
      else if (intent.rawPayload || intent.kind === 'raw') {kind = 'raw';}
      else if (intent.cluster != null) {kind = 'zcl';}
      else if (intent.mcu) {kind = 'mcu';}
      else {kind = 'dp';}
    }

    const pathId = kind === 'dp' ? 'tuya_dp'
      : kind === 'raw' ? 'raw_frame'
        : kind === 'tuya_bound' ? 'tuya_bound'
          : kind === 'cluster_bound' ? 'cluster_bound'
            : kind === 'mcu' || kind === 'magic' ? kind
              : 'zcl';

    try {
      // Prefer façade ordered cascade
      const io = this.io || device.io;
      if (io?.transmitWithFallback) {
        const mapped = {
          ...intent,
          kind: kind === 'tuya_bound' || kind === 'cluster_bound' || kind === 'mcu' || kind === 'magic'
            ? (kind === 'magic' || kind === 'mcu' ? 'dp' : 'zcl')
            : (kind === 'dp' ? 'dp' : kind === 'raw' ? 'raw' : 'zcl'),
        };

        // Bound / MCU specialized attempts BEFORE generic cascade
        if (kind === 'tuya_bound' || kind === 'cluster_bound') {
          const bound = await this._txBound(intent);
          if (bound.ok) {
            this._bump('tx', pathId);
            await this._afterTx(intent, bound);
            return { ...bound, path: pathId };
          }
        }
        if (kind === 'mcu' || kind === 'magic') {
          const mcu = await this._txMcu(intent, kind);
          if (mcu.ok) {
            this._bump('tx', pathId);
            await this._afterTx(intent, mcu);
            return { ...mcu, path: pathId };
          }
        }

        const r = await io.transmitWithFallback(mapped);
        if (r?.ok) {
          this._bump('tx', pathId);
          await this._afterTx(intent, r);
          return { ...r, path: pathId };
        }
        // Fall through to peer paths
      }

      // Peer cascade: DP ↔ ZCL ↔ raw ↔ magic
      const peers = this._peerTxOrder(kind);
      for (const peer of peers) {
        // eslint-disable-next-line no-await-in-loop
        const r = await this._txPeer(peer, intent);
        if (r?.ok) {
          this._bump('tx', peer);
          await this._afterTx(intent, r);
          return { ...r, path: peer };
        }
      }
      this.stats.errors += 1;
      return { ok: false, path: pathId, reason: 'all-paths-failed' };
    } catch (err) {
      this.stats.errors += 1;
      this._log('transmit failed:', err?.message || err);
      return { ok: false, error: err?.message || String(err) };
    }
  }

  _peerTxOrder(kind) {
    const base = ['tuya_dp', 'zcl', 'tuya_bound', 'raw_frame', 'mcu', 'magic'];
    const primary = kind === 'dp' ? 'tuya_dp'
      : kind === 'raw' ? 'raw_frame'
        : kind === 'tuya_bound' ? 'tuya_bound'
          : kind === 'mcu' || kind === 'magic' ? kind : 'zcl';
    return [primary, ...base.filter((p) => p !== primary)];
  }

  async _txPeer(pathId, intent) {
    const io = this.io || this.device.io;
    if (!io) {return { ok: false };}
    try {
      if (pathId === 'tuya_dp' && intent.dp != null && io.sendDP) {
        const ok = await io.sendDP(intent.dp, intent.value, { ...(intent.opts || {}), skipFallback: true });
        return ok ? { ok: true, via: 'sendDP' } : { ok: false };
      }
      if (pathId === 'zcl' && intent.cluster != null && io.writeZcl) {
        const ok = await io.writeZcl(intent.ep ?? 1, intent.cluster, intent.attributes || {});
        return ok ? { ok: true, via: 'writeZcl' } : { ok: false };
      }
      if (pathId === 'raw_frame' && io.sendRaw) {
        const ok = await io.sendRaw(
          intent.clusterId ?? intent.cluster ?? 0xEF00,
          intent.rawPayload || intent.payload || Buffer.alloc(0),
          intent.opts || {},
        );
        return ok ? { ok: true, via: 'sendRaw' } : { ok: false };
      }
      if (pathId === 'tuya_bound') {return this._txBound(intent);}
      if (pathId === 'mcu' || pathId === 'magic') {return this._txMcu(intent, pathId);}
    } catch (_e) { /* next */ }
    return { ok: false };
  }

  async _txBound(intent) {
    const io = this.io || this.device.io;
    const clusterIds = intent.clusterIds
      || (intent.cluster != null ? [intent.cluster] : [0xE000, 0xE001, 0xE002]);
    for (const cid of clusterIds) {
      try {
        if (io?.bindCluster) {
          // eslint-disable-next-line no-await-in-loop
          const ok = await io.bindCluster(intent.ep ?? 1, cid);
          if (ok) {return { ok: true, via: 'bindCluster', cluster: cid };}
        }
        if (io?.sendRaw && intent.rawPayload) {
          // eslint-disable-next-line no-await-in-loop
          const ok = await io.sendRaw(cid, intent.rawPayload, intent.opts || {});
          if (ok) {return { ok: true, via: 'bound-raw', cluster: cid };}
        }
      } catch (_e) { /* next bound id */ }
    }
    return { ok: false };
  }

  async _txMcu(intent, kind) {
    const io = this.io || this.device.io;
    try {
      if (kind === 'magic' && io?.magicHandshake) {
        const ok = await io.magicHandshake(intent.opts || {});
        if (ok) {return { ok: true, via: 'magicHandshake' };}
      }
      if (io?.queryAllDPs) {
        const ok = await io.queryAllDPs(intent.opts || {});
        if (ok) {return { ok: true, via: 'queryAllDPs' };}
      }
      try {
        const { configureMcuVersionRequest } = require('../tuya/MCUVersionHelper');
        const { findTuyaCluster } = require('../tuya/MagicPacketRegistry');
        const cluster = findTuyaCluster(this.device, this.device?.zclNode);
        if (cluster) {
          const ok = await configureMcuVersionRequest(this.device, cluster, intent.opts || {});
          if (ok) {return { ok: true, via: 'mcuVersion' };}
        }
      } catch (_e) { /* optional */ }
    } catch (_e) { /* soft */ }
    return { ok: false };
  }

  async _afterTx(intent, result) {
    try {
      if (intent.capability != null && intent.value !== undefined && this.device.confirmOutbound) {
        await this.device.confirmOutbound(intent.capability, intent.value, {
          source: sourceForPath(result.path || intent.kind || 'ui'),
          apply: intent.apply !== false,
          peerConfirm: intent.peerConfirm !== false,
        });
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * Unified RX — ProtocolFallbackChain.receive then confirmInbound when value known.
   */
  async receive(intent = {}) {
    const device = this.device;
    if (!device || device._destroyed) {return { ok: false, reason: 'destroyed' };}

    try {
      const io = this.io || device.io;
      let result = null;
      if (io?.receiveWithFallback) {
        result = await io.receiveWithFallback(intent);
      }

      // Cluster-classified raw sample
      if ((!result || !result.ok) && intent.clusterId != null && intent.value !== undefined) {
        const pathId = classifyCluster(intent.clusterId);
        this._bump('rx', pathId);
        if (intent.capability != null && device.confirmInbound) {
          const conf = await device.confirmInbound(
            intent.capability,
            intent.value,
            sourceForPath(pathId),
            intent.confidence ?? 0.85,
          );
          return { ok: !!conf.ok, path: pathId, confirm: conf, via: 'classify' };
        }
        return { ok: true, path: pathId, via: 'classify-note' };
      }

      if (result?.ok) {
        const via = result.via || result.result?.source || 'rx';
        const pathId = via.includes('tuya') || via.includes('dp') ? 'tuya_dp'
          : via.includes('zcl') ? 'zcl'
            : via.includes('raw') ? 'raw_frame'
              : via.includes('ias') ? 'ias'
                : via.includes('poll') || via.includes('query') ? 'mcu'
                  : 'zcl';
        this._bump('rx', pathId);

        const value = result.result?.value !== undefined ? result.result.value : intent.value;
        if (intent.capability != null && value !== undefined && device.confirmInbound) {
          const conf = await device.confirmInbound(
            intent.capability,
            value,
            sourceForPath(pathId),
            intent.confidence ?? 0.85,
          );
          return { ...result, path: pathId, confirm: conf };
        }
        return { ...result, path: pathId };
      }

      this.stats.errors += 1;
      return { ok: false, reason: 'rx-miss' };
    } catch (err) {
      this.stats.errors += 1;
      return { ok: false, error: err?.message || String(err) };
    }
  }

  /**
   * Note a passive RX (from raw frame hook / DP listener) without full cascade.
   */
  noteRx(clusterId, meta = {}) {
    try {
      const pathId = classifyCluster(clusterId);
      this._bump('rx', pathId);
      if (this.device.protocolOptimizer?.registerHit) {
        const proto = pathId === 'tuya_dp' ? 'tuya'
          : pathId === 'ias' ? 'ias'
            : pathId === 'raw_frame' ? 'raw' : 'zcl';
        this.device.protocolOptimizer.registerHit(
          proto,
          meta.identifier ?? clusterId,
          meta.value,
          meta.capability || null,
        );
      }
      if (meta.capability != null && meta.value !== undefined && this.device.confirmInbound) {
        Promise.resolve(
          this.device.confirmInbound(meta.capability, meta.value, sourceForPath(pathId), meta.confidence ?? 0.8),
        ).catch(() => {});
      }
      return pathId;
    } catch (_e) {
      return null;
    }
  }

  noteTx(pathId, meta = {}) {
    try {
      this._bump('tx', pathId || 'zcl');
      if (meta.capability != null && meta.value !== undefined && this.device.confirmOutbound) {
        Promise.resolve(
          this.device.confirmOutbound(meta.capability, meta.value, {
            source: sourceForPath(pathId),
            apply: false,
            peerConfirm: !!meta.peerConfirm,
          }),
        ).catch(() => {});
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * Soft-wrap DeviceIOFacade hot paths so successes feed the inventory.
   */
  wrapIoFacade(io) {
    if (!io || this._wrapped || io.__rxtxWrapped) {return false;}
    this._wrapped = true;
    io.__rxtxWrapped = true;
    const chain = this;
    const wrap = (name, pathId, isTx) => {
      const orig = io[name];
      if (typeof orig !== 'function') {return;}
      io[name] = async function wrappedIoMethod(...args) {
        const result = await orig.apply(this, args);
        try {
          if (result) {
            if (isTx) {chain.noteTx(pathId, {});}
            else {chain._bump('rx', pathId);}
          }
        } catch (_e) { /* soft */ }
        return result;
      };
    };
    wrap('sendDP', 'tuya_dp', true);
    wrap('queryAllDPs', 'mcu', true);
    wrap('magicHandshake', 'magic', true);
    wrap('sendRaw', 'raw_frame', true);
    wrap('bindCluster', 'cluster_bound', true);
    wrap('writeZcl', 'zcl', true);
    wrap('readZcl', 'zcl', false);
    return true;
  }
}

/**
 * Attach chain onto device + wrap io if present.
 */
async function attachProtocolRxTxChain(device, zclNode) {
  if (!device || device._destroyed || device._protocolRxTxAttached) {
    return { skipped: true };
  }
  device._protocolRxTxAttached = true;

  const chain = new ProtocolRxTxChain(device, { io: device.io });
  device.protocolRxTx = chain;
  device.tx = (intent) => chain.transmit(intent);
  device.rx = (intent) => chain.receive(intent);

  if (device.io) {
    chain.wrapIoFacade(device.io);
  }

  // Arm append-only raw frame tap onto zclNode for passive RX stream & classification
  const node = zclNode || device.zclNode || device.node;
  if (node && !device._protocolRxTxFrameHooked) {
    try {
      const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
      wrapHandleFrame(node, 'protocol-rxtx-raw-stream', (args, next) => {
        try {
          const multi = args.length >= 3;
          const frame = multi ? args[2] : args[0];
          const cid = multi
            ? args[1]
            : (frame?.clusterId ?? frame?.cluster);
          if (cid != null) {
            chain.noteRx(cid, {
              raw: true,
              frame,
              endpoint: multi ? args[0]?.endpointId ?? args[0] : frame?.endpointId,
              value: frame?.value ?? frame?.data,
            });
          }
        } catch (_e) { /* non-blocking tap */ }
        return next(...args);
      });
      device._protocolRxTxFrameHooked = true;
    } catch (_e) { /* soft */ }
  }

  // Ensure PFC has extended RX sources for IAS / tuya_bound (best-effort patch)
  try {
    _ensureExtendedFallbackOrders(device);
  } catch (_e) { /* soft */ }

  // Inventory log once
  try {
    const n = Object.keys(PROTOCOL_PATHS).length;
    device.log?.(`[RX/TX] ProtocolRxTxChain ready — ${n} paths inventoried`);
  } catch (_e) { /* noop */ }

  return {
    paths: Object.keys(PROTOCOL_PATHS).length,
    wrapped: chain._wrapped,
    inventory: chain.inventory().map((p) => p.id),
  };
}

function _ensureExtendedFallbackOrders(device) {
  const pfc = device.protocolFallbackChain || device.io?._fallbackChain;
  if (!pfc || !pfc.quirkTable) {return;}
  const fo = pfc.quirkTable.fallbackOrder || (pfc.quirkTable.fallbackOrder = {});
  if (Array.isArray(fo.rx)) {
    for (const extra of ['ias_zone', 'tuya_bound_report', 'mcu_report']) {
      if (!fo.rx.includes(extra)) {fo.rx.push(extra);}
    }
  }
  if (Array.isArray(fo.tx)) {
    for (const extra of ['tuya_bound_cluster', 'cluster_bind', 'mcu_version_helper']) {
      if (!fo.tx.includes(extra)) {fo.tx.push(extra);}
    }
  }
}

module.exports = {
  ProtocolRxTxChain,
  PROTOCOL_PATHS,
  attachProtocolRxTxChain,
  classifyCluster,
  sourceForPath,
};
