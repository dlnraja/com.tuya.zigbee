'use strict';

/**
 * DeviceIOFacade (P102 Phase 1 · P2269 Phase 2 split)
 *
 * Single outbound/inbound I/O surface for TuyaZigbeeDevice and Unified* bases.
 * Wraps existing managers — does not reimplement protocol engines.
 *
 * WHY (P215):
 * - Pourquoi: one installDeviceIO API for TX/RX + interview compensation.
 * - Comment: protocol I/O stays here; fuse* / exotic → DeviceFusionHooks.js.
 * - Pour qui: Homey Pro runtime (SDK3); CI agents via PROTOCOL_TX_RX_SSOT.
 * - Quand: onNodeInit attach + every capability commit path.
 * - Contre quoi: parallel LowLevelBridge cascades / native setCapabilityValue loops.
 *
 * Safety contract: missing cluster / manager → return false|null + log.
 * Never throw fatal during init or routine I/O.
 *
 * TIP HUM: docs/architecture/SPAGHETTI_MAP.md · COMM_PATHFINDING.md
 */

const { safeSetTimeout, safeSetInterval } = require('../utils/safe-timers');
const { shouldSkipIasOnlyEf00Tx } = require('./shouldSkipIasOnlyEf00Tx');

/**
 * WHY: leftover HYBRID-QUERY after DATA-RECOVERY caps OK (1cf775a2).
 * Skip queryAllDPs / passive EF00 TX on sleepy IAS-only.
 * Cluster truth (1280 present, 61184 absent) -- not tuyaEF00Manager.
 * Keep IAS/raw RX. Do not skip when 61184 is present (TS0601 MCU).
 * Implementation: lib/io/shouldSkipIasOnlyEf00Tx.js (P2287 pure helper).
 */

let sendTuyaMagicPacket;
try {
  ({ sendTuyaMagicPacket } = require('../zigbee/TuyaMagicPacket'));
} catch (_e) {
  sendTuyaMagicPacket = null;
}

let UnknownClusterHandler;
try {
  UnknownClusterHandler = require('../clusters/UnknownClusterHandler');
} catch (_e) {
  UnknownClusterHandler = null;
}

let IEEEAdvancedEnrollment;
try {
  IEEEAdvancedEnrollment = require('../managers/IEEEAdvancedEnrollment');
} catch (_e) {
  IEEEAdvancedEnrollment = null;
}

let IASZoneEnhanced;
try {
  IASZoneEnhanced = require('../managers/IASZoneEnhanced');
} catch (_e) {
  IASZoneEnhanced = null;
}

let HybridProtocolManager;
try {
  HybridProtocolManager = require('../protocol/HybridProtocolManager');
} catch (_e) {
  HybridProtocolManager = null;
}

let IntelligentProtocolRouter;
try {
  IntelligentProtocolRouter = require('../protocol/IntelligentProtocolRouter');
} catch (_e) {
  IntelligentProtocolRouter = null;
}

let ZigbeeDataQuery;
try {
  const zq = require('../zigbee/ZigbeeDataQuery');
  ZigbeeDataQuery = zq.ZigbeeDataQuery || zq.DataQuery || (typeof zq === 'function' ? zq : null);
} catch (_e) {
  ZigbeeDataQuery = null;
}

let UniversalClusterBinder;
try {
  UniversalClusterBinder = require('../clusters/UniversalClusterBinder');
} catch (_e) {
  UniversalClusterBinder = null;
}

let RawClusterFallback;
try {
  RawClusterFallback = require('../clusters/RawClusterFallback');
} catch (_e) {
  RawClusterFallback = null;
}

let HomeyCompensationLayer;
let loadProtocolQuirkTable;
try {
  ({ HomeyCompensationLayer, loadProtocolQuirkTable } = require('./HomeyCompensationLayer'));
} catch (_e) {
  HomeyCompensationLayer = null;
  loadProtocolQuirkTable = null;
}

let ProtocolFallbackChain;
try {
  ProtocolFallbackChain = require('./ProtocolFallbackChain');
} catch (_e) {
  ProtocolFallbackChain = null;
}

let PollControlPolicy;
try {
  PollControlPolicy = require('../zigbee/PollControlPolicy');
} catch (_e) {
  PollControlPolicy = null;
}

const DEFAULT_CHANNELS = Object.freeze({
  tuya_dp: true,
  tuya_bound: true,
  zcl_attr: true,
  zcl_bound: true,
  zcl_poll: true,
  raw: true,
  ias: true,
  wifi_lan: true,
  wifi_cloud: true,
});

class DeviceIOFacade {
  /**
   * @param {object} device Homey ZigBee device (TuyaZigbeeDevice or Unified* base)
   */
  constructor(device) {
    this.device = device;
    this.protocol = null; // 'tuya_dp' | 'zcl_standard' | 'hybrid' | 'TUYA_DP' | ...
    this.channels = { ...DEFAULT_CHANNELS };
    this._protocolPicker = null; // HybridProtocolManager | IntelligentProtocolRouter
    this._zclQuery = null;
    this._binder = null;
    this._rawFallback = null;
    this._iasEnrollment = null;
    this._compensation = null;
    this._fallbackChain = null;
    this._quirkTable = null;
    this._reportPollTimer = null;
    this._passiveTuyaListen = false;
    this._ready = false;
  }

  _log(...args) {
    try {
      (this.device._boundLog || this.device.log)?.('[IO]', ...args);
    } catch (_e) { /* noop */ }
  }

  _err(...args) {
    try {
      (this.device._boundError || this.device.error || this.device.log)?.('[IO]', ...args);
    } catch (_e) { /* noop */ }
  }

  /**
   * Attach optional managers already present on the device, create thin helpers.
   * Safe to call multiple times; never throws.
   */
  attach(zclNode) {
    try {
      if (zclNode) {
        this.device.zclNode = this.device.zclNode || zclNode;
      }

      if (ZigbeeDataQuery && !this._zclQuery) {
        try {
          this._zclQuery = this.device._zigbeeDataQuery || new ZigbeeDataQuery(this.device);
          this.device._zigbeeDataQuery = this._zclQuery;
        } catch (e) {
          this._log('ZigbeeDataQuery attach skipped:', e?.message || e);
        }
      }

      if (UniversalClusterBinder && !this._binder && !this.device.clusterBinder) {
        try {
          this._binder = new UniversalClusterBinder(this.device);
          this.device.clusterBinder = this._binder;
        } catch (e) {
          this._log('UniversalClusterBinder attach skipped:', e?.message || e);
        }
      } else if (this.device.clusterBinder) {
        this._binder = this.device.clusterBinder;
      }

      if (RawClusterFallback && !this._rawFallback && !this.device.rawClusterFallback) {
        try {
          this._rawFallback = new RawClusterFallback(this.device);
          this.device.rawClusterFallback = this._rawFallback;
        } catch (e) {
          this._log('RawClusterFallback attach skipped:', e?.message || e);
        }
      } else if (this.device.rawClusterFallback) {
        this._rawFallback = this.device.rawClusterFallback;
      }

      if (IEEEAdvancedEnrollment && !this._iasEnrollment) {
        try {
          this._iasEnrollment = new IEEEAdvancedEnrollment(this.device);
          this.device._iasAdvancedEnrollment = this._iasEnrollment;
        } catch (e) {
          this._log('IEEEAdvancedEnrollment attach skipped:', e?.message || e);
        }
      }

      // P102: Homey compensation + protocol fallback chain (never fatal)
      this._attachCompensationLayer(zclNode);

      this._ready = true;
      return true;
    } catch (err) {
      this._err('attach failed (non-fatal):', err?.message || err);
      this._ready = true; // façade methods still usable in safe-no-op mode
      return true;
    }
  }

  /**
   * Wire HomeyCompensationLayer + ProtocolFallbackChain. Safe if modules missing.
   * @private
   */
  _attachCompensationLayer(zclNode) {
    try {
      if (typeof loadProtocolQuirkTable === 'function' && !this._quirkTable) {
        this._quirkTable = loadProtocolQuirkTable();
      }

      if (HomeyCompensationLayer && !this._compensation) {
        this._compensation = new HomeyCompensationLayer(this.device, {
          io: this,
          quirkTable: this._quirkTable,
        });
        this.device.homeyCompensation = this._compensation;
        try {
          this._compensation.compensateInterviewMiss(zclNode || this.device.zclNode);
          this._compensation.installFlowCompensation(this.device.driver || this.device.homey);
        } catch (e) {
          this._log('compensation interview/flow skipped:', e?.message || e);
        }
      } else if (this.device.homeyCompensation) {
        this._compensation = this.device.homeyCompensation;
      }

      if (ProtocolFallbackChain && !this._fallbackChain) {
        this._fallbackChain = new ProtocolFallbackChain(this.device, {
          io: this,
          compensation: this._compensation,
          quirkTable: this._quirkTable,
        });
        this.device.protocolFallbackChain = this._fallbackChain;
      } else if (this.device.protocolFallbackChain) {
        this._fallbackChain = this.device.protocolFallbackChain;
      }
    } catch (e) {
      this._log('compensation layer attach skipped:', e?.message || e);
    }
  }

  /** @returns {object|null} */
  get compensation() {
    return this._compensation;
  }

  /** @returns {object|null} */
  get fallbackChain() {
    return this._fallbackChain;
  }

  /**
   * Ordered TX via ProtocolFallbackChain (never fatal).
   */
  async transmitWithFallback(intent = {}) {
    try {
      if (!this._fallbackChain) {this._attachCompensationLayer(this.device.zclNode);}
      if (!this._fallbackChain) {return { ok: false, via: null };}
      return await this._fallbackChain.transmit(intent);
    } catch (err) {
      this._log('transmitWithFallback failed:', err?.message || err);
      return { ok: false, via: null, error: err?.message };
    }
  }

  /**
   * Ordered RX via ProtocolFallbackChain (never fatal).
   */
  async receiveWithFallback(intent = {}) {
    try {
      if (!this._fallbackChain) {this._attachCompensationLayer(this.device.zclNode);}
      if (!this._fallbackChain) {return { ok: false, via: null };}
      return await this._fallbackChain.receive(intent);
    } catch (err) {
      this._log('receiveWithFallback failed:', err?.message || err);
      return { ok: false, via: null, error: err?.message };
    }
  }

  /**
   * Run interview-miss compensation + recommended init sequences.
   */
  async compensateInterview(opts = {}) {
    try {
      if (!this._compensation) {this._attachCompensationLayer(this.device.zclNode);}
      if (!this._compensation) {return { ok: false };}
      return await this._compensation.attach(this.device.zclNode, opts);
    } catch (err) {
      this._log('compensateInterview failed:', err?.message || err);
      return { ok: false, error: err?.message };
    }
  }

  /**
   * Single protocol pick via HybridProtocolManager, else IntelligentProtocolRouter.
   * Exposes protocol + enabled channels for bases to consume (no mass Unified* rewrite).
   */
  async pickProtocol(zclNode, manufacturerName, productId) {
    try {
      this.attach(zclNode);

      const mfr = manufacturerName
        || this.device.getSetting?.('zb_manufacturer_name')
        || this.device.getData?.()?.manufacturerName
        || '';
      const pid = productId
        || this.device.getSetting?.('zb_model_id')
        || this.device.getData?.()?.modelId
        || '';

      const node = zclNode || this.device.zclNode;

      if (HybridProtocolManager) {
        try {
          this._protocolPicker = this.device.hybridProtocolManager
            || new HybridProtocolManager(this.device);
          this.device.hybridProtocolManager = this._protocolPicker;
          const proto = await this._protocolPicker.initialize(node, mfr, pid);
          this.protocol = proto;
          this._syncChannelsFromHybrid();
          this._publishProtocolInfo(proto, true);
          return proto;
        } catch (e) {
          this._log('HybridProtocolManager pick failed, falling back:', e?.message || e);
        }
      }

      if (IntelligentProtocolRouter) {
        try {
          this._protocolPicker = this.device.protocolRouter
            || new IntelligentProtocolRouter(this.device);
          this.device.protocolRouter = this._protocolPicker;
          const proto = await this._protocolPicker.detectProtocol(node, mfr);
          this.protocol = proto;
          this._syncChannelsFromRouter(proto);
          this._publishProtocolInfo(proto, false);
          return proto;
        } catch (e) {
          this._log('IntelligentProtocolRouter pick failed:', e?.message || e);
        }
      }

      this.protocol = 'hybrid';
      this.channels = { ...DEFAULT_CHANNELS };
      this._publishProtocolInfo(this.protocol, false);
      return this.protocol;
    } catch (err) {
      this._err('pickProtocol failed (non-fatal):', err?.message || err);
      this.protocol = 'hybrid';
      return this.protocol;
    }
  }

  _syncChannelsFromHybrid() {
    const stats = this._protocolPicker?._protocolStats;
    if (!stats) {return;}
    this.channels = {
      ...DEFAULT_CHANNELS,
      tuya_dp: stats.tuya_cluster?.enabled !== false || stats.tuya_bound?.enabled !== false,
      tuya_bound: stats.tuya_bound?.enabled !== false,
      zcl_attr: stats.zcl_attr?.enabled !== false,
      zcl_bound: stats.zcl_bound?.enabled !== false,
      zcl_poll: stats.zcl_poll?.enabled !== false,
    };
  }

  _syncChannelsFromRouter(proto) {
    const p = String(proto || '').toUpperCase();
    const tuya = p.includes('TUYA') || p === 'HYBRID';
    const zcl = p.includes('ZIGBEE') || p.includes('ZCL') || p === 'HYBRID' || p === 'ZIGBEE_NATIVE';
    this.channels = {
      ...DEFAULT_CHANNELS,
      tuya_dp: tuya,
      tuya_bound: tuya,
      zcl_attr: zcl,
      zcl_bound: zcl,
      zcl_poll: zcl,
    };
  }

  _publishProtocolInfo(proto, fromHybrid) {
    const p = String(proto || '');
    const upper = p.toUpperCase();
    const isTuyaDP = upper.includes('TUYA') || p === 'tuya_dp';
    const isHybrid = upper === 'HYBRID' || p === 'hybrid';
    this.device._protocolInfo = {
      ...(this.device._protocolInfo || {}),
      protocol: isHybrid ? 'HYBRID' : (isTuyaDP ? 'TUYA_DP' : (upper || 'UNKNOWN')),
      isTuyaDP: isTuyaDP || isHybrid,
      channels: { ...this.channels },
      source: fromHybrid ? 'HybridProtocolManager' : 'IntelligentProtocolRouter',
    };
    this.device.ioProtocol = this.protocol;
    this.device.ioChannels = { ...this.channels };
  }

  // ─── Tuya DP ─────────────────────────────────────────────────────────────

  _ef00() {
    return this.device.tuyaEF00Manager || null;
  }

  /**
   * Outbound DP with max compatibility chain:
   * DP manager → sendFrame/raw → magic → rescan/ensure → passive listen mark.
   */
  async sendDP(dp, value, opts = {}) {
    try {
      if (!this.channels.tuya_dp && !this.channels.tuya_bound) {
        this._log('sendDP skipped — tuya channels disabled');
        return false;
      }
      // P2314: heal IEEE before any cluster/datapoint TX (PresentSky dead controls)
      try {
        const { healZigbeeNodeIdentity } = require('./healZigbeeNodeIdentity');
        await healZigbeeNodeIdentity(this.device, { force: false });
      } catch (_e) { /* noop */ }

      const dpType = opts.dpType ?? opts.type ?? 'value';
      const skipFallback = opts.skipFallback === true;

      // 1) Canonical EF00 manager
      const ef00 = this._ef00();
      if (ef00 && typeof ef00.sendDP === 'function') {
        try {
          const ok = !!(await ef00.sendDP(dp, value, dpType, opts));
          if (ok) {return true;}
        } catch (e) {
          this._log('sendDP via manager failed:', e?.message || e);
        }
      }

      if (skipFallback) {return false;}

      // 2) Cluster setData / datapoint write when manager absent
      try {
        if (await this._clusterSetData(dp, value, dpType, opts)) {return true;}
      } catch (e) {
        this._log('sendDP cluster setData failed:', e?.message || e);
      }

      // 3) Raw sendFrame (best-effort datapoint write framing)
      try {
        const rawOk = await this._sendDpViaRawFrame(dp, value, dpType, opts);
        if (rawOk) {return true;}
      } catch (e) {
        this._log('sendDP raw frame failed:', e?.message || e);
      }

      // 4) Magic handshake then one soft retry (manager only)
      try {
        const magic = await this.magicHandshake({ endpoint: opts.endpoint ?? 1 });
        if (magic && ef00 && typeof ef00.sendDP === 'function') {
          const retry = !!(await ef00.sendDP(dp, value, dpType, opts));
          if (retry) {return true;}
        }
      } catch (e) {
        this._log('sendDP magic retry failed:', e?.message || e);
      }

      // 5) Rescan / ensure cluster then retry
      try {
        await this.ensureTuyaCluster({ endpoint: opts.endpoint ?? 1 });
        await this.scanUnknownClusters(this.device.zclNode);
        const ef00b = this._ef00();
        if (ef00b && typeof ef00b.sendDP === 'function') {
          const retry2 = !!(await ef00b.sendDP(dp, value, dpType, opts));
          if (retry2) {return true;}
        }
        if (await this._clusterSetData(dp, value, dpType, opts)) {return true;}
      } catch (e) {
        this._log('sendDP rescan retry failed:', e?.message || e);
      }

      // 6) Passive — mark for RX-only path; never throw
      this._enablePassiveTuyaListen(opts);
      this._log(`sendDP: all TX paths failed for dp=${dp} — passive listen armed`);
      return false;
    } catch (err) {
      this._log('sendDP failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Best-effort raw DP write when TuyaEF00Manager is absent.
   * @private
   */
  async _sendDpViaRawFrame(dp, value, dpType, opts = {}) {
    const typeMap = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };
    const typeId = typeof dpType === 'number' ? dpType : (typeMap[String(dpType).toLowerCase()] ?? 2);
    let dataBuf;
    if (Buffer.isBuffer(value)) {
      dataBuf = value;
    } else if (typeId === 1) {
      dataBuf = Buffer.from([value ? 1 : 0]);
    } else if (typeId === 4) {
      dataBuf = Buffer.from([Number(value) & 0xff]);
    } else if (typeId === 2) {
      const n = Number(value) >>> 0;
      dataBuf = Buffer.alloc(4);
      dataBuf.writeUInt32BE(n, 0);
    } else if (typeId === 5) {
      const n = Number(value) >>> 0;
      const len = n <= 0xff ? 1 : n <= 0xffff ? 2 : 4;
      dataBuf = Buffer.alloc(len);
      for (let i = 0; i < len; i++) { dataBuf[len - 1 - i] = (n >> (i * 8)) & 0xff; }
    } else if (typeId === 3) {
      dataBuf = Buffer.from(String(value || ''), 'utf8');
    } else {
      dataBuf = Buffer.isBuffer(value) ? value : Buffer.from([Number(value) || 0]);
    }
    const len = dataBuf.length;
    const payload = Buffer.alloc(6 + len);
    payload.writeUInt16BE(0, 0); // seq
    payload.writeUInt8(Number(dp) & 0xff, 2);
    payload.writeUInt8(typeId & 0xff, 3);
    payload.writeUInt16BE(len, 4);
    dataBuf.copy(payload, 6);
    return this.sendRaw(0xEF00, payload, {
      endpoint: opts.endpoint ?? 1,
      command: opts.command ?? 0x00,
    });
  }

  /**
   * Arm passive raw EF00 listen when interview omitted the cluster.
   * @private
   */
  _enablePassiveTuyaListen(opts = {}) {
    try {
      if (this._passiveTuyaListen) {return true;}
      this._passiveTuyaListen = true;
      this.device._tuyaPassiveListen = true;
      const node = this.device.zclNode;
      if (!node) {return true;}
      if (this.device._ioPassiveFrameHooked) {return true;}
      const device = this.device;
      // WHY(P2282/P2284): append-only wrapHandleFrame — never orphan 0xFD / L0 chain
      const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
      wrapHandleFrame(node, 'io-passive-ef00', (args, next) => {
        try {
          const multi = args.length >= 3;
          const frame = multi ? args[2] : args[0];
          const cid = multi
            ? args[1]
            : (frame?.clusterId ?? frame?.cluster);
          if (cid === 0xEF00 || cid === 61184) {
            const mgr = device.tuyaEF00Manager;
            if (mgr && typeof mgr.parseTuyaFrame === 'function' && frame?.data) {
              Promise.resolve(mgr.parseTuyaFrame(frame.data)).catch(() => {});
            } else if (mgr && typeof mgr.handleDatapoint === 'function') {
              Promise.resolve(mgr.handleDatapoint(frame)).catch(() => {});
            } else if (mgr && typeof mgr.handleParsedDP === 'function' && frame?.dp != null) {
              Promise.resolve(mgr.handleParsedDP(frame.dp, frame.value, frame.datatype)).catch(() => {});
            }
          }
        } catch (_e) { /* noop */ }
        return next(...args);
      });
      device._ioPassiveFrameHooked = true;
      this._log('passive Tuya EF00 listen armed (chain)');
      return true;
    } catch (e) {
      this._log('passive listen arm failed:', e?.message || e);
      return false;
    }
  }

  /**
   * Resolve Tuya EF00 cluster across endpoints (aliases from quirk table).
   * @private
   */
  _findTuyaClusterAny(endpointIds = [1, 2, 0]) {
    if (this._compensation?.findTuyaCluster) {
      const found = this._compensation.findTuyaCluster(this.device.zclNode, endpointIds);
      if (found?.cluster) {return found;}
    }
    const node = this.device.zclNode;
    const aliases = ['tuya', 'tuyaManufacturer', 'manuSpecificTuya', 'tuyaSpecific', 0xEF00, 61184, '61184', '0xEF00'];
    for (const epId of endpointIds) {
      const ep = node?.endpoints?.[epId];
      if (!ep?.clusters) {continue;}
      for (const key of aliases) {
        const c = ep.clusters[key];
        if (c) {return { endpointId: epId, cluster: c, key };}
      }
    }
    return null;
  }

  /**
   * Direct cluster setData / datapoint write when EF00 manager absent.
   * @private
   */
  async _clusterSetData(dp, value, dpType, opts = {}) {
    const found = this._findTuyaClusterAny(opts.endpoints || [1, 2, 0]);
    if (!found?.cluster) {return false;}
    const c = found.cluster;
    const typeMap = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };
    const typeId = typeof dpType === 'number' ? dpType : (typeMap[String(dpType).toLowerCase()] ?? 2);
    try {
      if (typeof c.setData === 'function') {
        await c.setData({ dp, datatype: typeId, data: value });
        return true;
      }
      if (typeof c.writeData === 'function') {
        await c.writeData({ dp, datatype: typeId, data: value });
        return true;
      }
      if (typeof c.datapoint === 'function') {
        await c.datapoint({ dp, datatype: typeId, data: value });
        return true;
      }
      if (typeof c.command === 'function') {
        await c.command('dataRequest', { dp, datatype: typeId, data: value }, {
          disableDefaultResponse: true,
        });
        return true;
      }
    } catch (e) {
      this._log('_clusterSetData failed:', e?.message || e);
    }
    return false;
  }

  /**
   * Direct cluster dataQuery / command when EF00 manager absent.
   * @private
   */
  async _clusterDataQuery(opts = {}) {
    if (shouldSkipIasOnlyEf00Tx(this.device)) {return false;}
    const found = this._findTuyaClusterAny(opts.endpoints || [1, 2, 0]);
    if (!found?.cluster) {return false;}
    const c = found.cluster;
    try {
      if (typeof c.dataQuery === 'function') {
        await c.dataQuery(opts.dp != null ? { dp: opts.dp } : {});
        return true;
      }
      if (typeof c.command === 'function') {
        await c.command('dataQuery', opts.dp != null ? { dp: opts.dp } : {}, { disableDefaultResponse: true });
        return true;
      }
      if (typeof c.getData === 'function') {
        await c.getData(opts.dp != null ? { dp: opts.dp } : {});
        return true;
      }
    } catch (e) {
      this._log('_clusterDataQuery failed:', e?.message || e);
    }
    // Raw cmd 0x03 (query_all) / 0x01 (get) per quirk table
    try {
      const cmd = opts.dp != null ? 0x01 : 0x03;
      const payload = opts.dp != null
        ? Buffer.from([0x00, 0x00, Number(opts.dp) & 0xff])
        : Buffer.from([0x00, 0x00]);
      return !!(await this.sendRaw(0xEF00, payload, {
        endpoint: found.endpointId,
        command: cmd,
      }));
    } catch (_e) {
      return false;
    }
  }

  async requestDP(dp, opts = {}) {
    try {
      if (shouldSkipIasOnlyEf00Tx(this.device)) {
        this._log(`requestDP skipped (IAS-only / no 61184) dp=${dp}`);
        return false;
      }
      const skipFallback = opts.skipFallback === true;

      // 1) EF00 manager (already multi-method internally)
      const ef00 = this._ef00();
      if (ef00 && typeof ef00.requestDP === 'function') {
        try {
          const ok = !!(await ef00.requestDP(dp, opts));
          if (ok) {return true;}
        } catch (e) {
          this._log('requestDP via manager failed:', e?.message || e);
        }
      }

      if (skipFallback) {return false;}

      // 2) Direct cluster dataQuery / command / raw
      try {
        if (await this._clusterDataQuery({ ...opts, dp })) {return true;}
      } catch (e) {
        this._log('requestDP cluster path failed:', e?.message || e);
      }

      // 3) Magic handshake + manager/cluster retry
      try {
        await this.magicHandshake({ endpoint: opts.endpoint ?? 1 });
        const ef00b = this._ef00();
        if (ef00b && typeof ef00b.requestDP === 'function') {
          const retry = !!(await ef00b.requestDP(dp, opts));
          if (retry) {return true;}
        }
        if (await this._clusterDataQuery({ ...opts, dp })) {return true;}
      } catch (e) {
        this._log('requestDP magic retry failed:', e?.message || e);
      }

      // 4) MCUVersionHelper nudge (wakes MCU report stream) then retry
      try {
        const { configureMcuVersionRequest } = require('../tuya/MCUVersionHelper');
        const found = this._findTuyaClusterAny(opts.endpoints || [1, 2, 0]);
        if (found?.cluster && typeof configureMcuVersionRequest === 'function') {
          await configureMcuVersionRequest(this.device, found.cluster, opts);
          if (await this._clusterDataQuery({ ...opts, dp })) {return true;}
          const ef00c = this._ef00();
          if (ef00c && typeof ef00c.requestDP === 'function') {
            const ok = !!(await ef00c.requestDP(dp, opts));
            if (ok) {return true;}
          }
        }
      } catch (e) {
        this._log('requestDP MCUVersionHelper failed:', e?.message || e);
      }

      // 5) Ensure cluster + one more try
      try {
        await this.ensureTuyaCluster({ endpoint: opts.endpoint ?? 1 });
        if (await this._clusterDataQuery({ ...opts, dp })) {return true;}
      } catch (e) {
        this._log('requestDP ensure retry failed:', e?.message || e);
      }

      this._enablePassiveTuyaListen(opts);
      this._log(`requestDP: all paths failed for dp=${dp}`);
      return false;
    } catch (err) {
      this._log('requestDP failed:', err?.message || err);
      return false;
    }
  }

  shouldSkipIasOnlyEf00Tx() {
    return shouldSkipIasOnlyEf00Tx(this.device);
  }

  async queryAllDPs(opts = {}) {
    try {
      if (shouldSkipIasOnlyEf00Tx(this.device)) {
        this._log('queryAllDPs skipped (IAS-only / no 61184)');
        return false;
      }
      const skipFallback = opts.skipFallback === true;

      // 1) EF00 manager aliases
      const ef00 = this._ef00();
      if (ef00) {
        try {
          if (typeof ef00.queryAllDatapoints === 'function') {
            const ok = !!(await ef00.queryAllDatapoints(opts));
            if (ok) {return true;}
          } else if (typeof ef00.requestAllDPs === 'function') {
            const ok = !!(await ef00.requestAllDPs(opts));
            if (ok) {return true;}
          }
        } catch (e) {
          this._log('queryAllDPs via manager failed:', e?.message || e);
        }
      }

      if (skipFallback) {return false;}

      // 2) MagicPacketRegistry / MCUVersionHelper sequences
      try {
        const {
          getMagicPacketConfig,
          executeMagicPackets,
          findTuyaCluster,
        } = require('../tuya/MagicPacketRegistry');
        const mfr = this.device.getSetting?.('zb_manufacturer_name')
          || this.device.getData?.()?.manufacturerName
          || '';
        const pid = this.device.getSetting?.('zb_model_id')
          || this.device.getData?.()?.modelId
          || this.device.getData?.()?.productId
          || '';
        const cfg = getMagicPacketConfig(mfr, pid);
        const cluster = findTuyaCluster(this.device, this.device.zclNode)
          || this._findTuyaClusterAny()?.cluster;
        if (cfg && cluster) {
          const ok = !!(await executeMagicPackets(this.device, cluster, cfg));
          if (ok) {return true;}
        }
        try {
          const { configureMcuVersionRequest } = require('../tuya/MCUVersionHelper');
          if (cluster && typeof configureMcuVersionRequest === 'function') {
            const ok2 = !!(await configureMcuVersionRequest(this.device, cluster, opts));
            if (ok2) {return true;}
          }
        } catch (_e) { /* optional */ }
      } catch (e) {
        this._log('queryAllDPs magic-registry failed:', e?.message || e);
      }

      // 3) Direct cluster / raw cmd 0x03
      try {
        if (await this._clusterDataQuery({ ...opts, dp: undefined })) {return true;}
      } catch (e) {
        this._log('queryAllDPs cluster path failed:', e?.message || e);
      }

      // 4) Magic handshake + retry
      try {
        await this.magicHandshake({ endpoint: opts.endpoint ?? 1 });
        await this.ensureTuyaCluster({ endpoint: opts.endpoint ?? 1 });
        const ef00b = this._ef00();
        if (ef00b && typeof ef00b.requestAllDPs === 'function') {
          const retry = !!(await ef00b.requestAllDPs(opts));
          if (retry) {return true;}
        }
        if (await this._clusterDataQuery(opts)) {return true;}
      } catch (e) {
        this._log('queryAllDPs magic retry failed:', e?.message || e);
      }

      this._enablePassiveTuyaListen(opts);
      this._log('queryAllDPs: all paths failed — passive listen armed');
      return false;
    } catch (err) {
      this._log('queryAllDPs failed:', err?.message || err);
      return false;
    }
  }

  /**
   * P110: expose MCU time sync on the I/O surface (HomeyCompensation tuya_time_sync).
   */
  async syncTime(opts = {}) {
    try {
      const ef00 = this._ef00();
      const zclNode = this.device?.zclNode;
      if (!ef00 || typeof ef00.sendTimeSync !== 'function' || !zclNode) {
        return false;
      }
      await ef00.sendTimeSync(zclNode, opts);
      return true;
    } catch (err) {
      this._log('syncTime failed:', err?.message || err);
      return false;
    }
  }

  // ─── ZCL ─────────────────────────────────────────────────────────────────

  _resolveCluster(endpointId, cluster) {
    if (cluster == null) {return null;}
    const epId = endpointId == null ? 1 : endpointId;
    // Compensation alias map first (interview-miss names)
    if (this._compensation?.resolveCluster && (typeof cluster === 'number' || /^0x/i.test(String(cluster)))) {
      const cid = typeof cluster === 'number' ? cluster : parseInt(String(cluster), 16);
      if (!Number.isNaN(cid)) {
        const resolved = this._compensation.resolveCluster(cid, epId);
        if (resolved?.cluster) {return resolved.cluster;}
      }
    }
    const ep = this.device.zclNode?.endpoints?.[epId];
    if (!ep?.clusters) {return null;}

    try {
      const { findClusterOnEndpoint } = require('../zigbee/ZclClusterLexicon');
      const found = findClusterOnEndpoint(ep, cluster);
      if (found) {return found;}
    } catch (_e) { /* fallback to case-insensitive scan */ }

    // Fallback: case-insensitive scan of ep.clusters keys
    const lower = String(cluster).toLowerCase().trim();
    for (const [k, v] of Object.entries(ep.clusters)) {
      if (k.toLowerCase().trim() === lower) {return v;}
    }

    return null;
  }

  /**
   * Try endpoints 1,2,0 then all keys when primary ep misses the cluster.
   * @private
   */
  _resolveClusterMultiEp(preferredEp, cluster) {
    const tryEps = [preferredEp, 1, 2, 0].filter((v, i, a) => v != null && a.indexOf(v) === i);
    for (const epId of tryEps) {
      const c = this._resolveCluster(epId, cluster);
      if (c) {return { epId, cluster: c };}
    }
    const endpoints = this.device.zclNode?.endpoints || {};
    for (const key of Object.keys(endpoints)) {
      const epId = Number(key);
      if (tryEps.includes(epId)) {continue;}
      const c = this._resolveCluster(epId, cluster);
      if (c) {return { epId, cluster: c };}
    }
    return null;
  }

  async readZcl(ep, cluster, attrs, opts = {}) {
    try {
      const list = Array.isArray(attrs) ? attrs : [attrs];
      const found = this._resolveClusterMultiEp(ep, cluster);
      if (!found) {
        this._log(`readZcl: cluster missing ep=${ep} cluster=${cluster}`);
        // Named-cluster FallbackChains may still resolve raw/numeric aliases
        if (typeof cluster === 'string' && list.length === 1 && typeof list[0] === 'string') {
          try {
            const { readSensorWithFallbacks } = require('../zigbee/FallbackChains');
            const out = await readSensorWithFallbacks(this.device, null, cluster, list[0], {
              dpFallback: opts.dpFallback,
            });
            if (out?.ok) {return { [list[0]]: out.value, _via: out.via };}
          } catch (_e) { /* optional */ }
        }
        return null;
      }
      const c = found.cluster;

      // Path A: SDK readAttributes
      if (typeof c.readAttributes === 'function') {
        try {
          return await c.readAttributes(list);
        } catch (e) {
          this._log('readZcl readAttributes failed, trying raw:', e?.message || e);
        }
      }

      // Path B: FallbackChains (named → raw numeric → optional DP)
      if (typeof cluster === 'string' && list.length === 1 && typeof list[0] === 'string') {
        try {
          const { readSensorWithFallbacks } = require('../zigbee/FallbackChains');
          const out = await readSensorWithFallbacks(this.device, c, cluster, list[0], {
            dpFallback: opts.dpFallback,
          });
          if (out?.ok) {return { [list[0]]: out.value, _via: out.via };}
        } catch (e) {
          this._log('readZcl FallbackChains failed:', e?.message || e);
        }
      }

      // Path C: sendFrame Read Attributes (global cmd 0x00)
      try {
        const numericAttrs = list.map((a) => {
          if (typeof a === 'number') {return a;}
          const n = parseInt(a, 10);
          return Number.isNaN(n) ? null : n;
        }).filter((n) => n != null);
        if (numericAttrs.length && typeof this.sendRaw === 'function') {
          const buf = Buffer.alloc(numericAttrs.length * 2);
          numericAttrs.forEach((attr, i) => { buf.writeUInt16LE(attr & 0xffff, i * 2); });
          const clusterId = typeof cluster === 'number' ? cluster : (c?.ID ?? c?.id);
          if (clusterId != null) {
            const ok = await this.sendRaw(clusterId, buf, {
              endpoint: found.epId,
              command: 0x00,
            });
            if (ok) {return { _rawReadIssued: true, attrs: numericAttrs };}
          }
        }
      } catch (e) {
        this._log('readZcl raw path failed:', e?.message || e);
      }

      return null;
    } catch (err) {
      this._log('readZcl failed:', err?.message || err);
      return null;
    }
  }

  async writeZcl(ep, cluster, attributes) {
    try {
      const found = this._resolveClusterMultiEp(ep, cluster);
      if (!found) {
        this._log(`writeZcl: cluster missing ep=${ep} cluster=${cluster}`);
        return false;
      }
      const c = found.cluster;

      // Path A: SDK writeAttributes
      if (typeof c.writeAttributes === 'function') {
        try {
          await c.writeAttributes(attributes || {});
          return true;
        } catch (e) {
          this._log('writeZcl writeAttributes failed, trying writeRaw:', e?.message || e);
        }
      }

      // Path B: writeRaw if available
      if (typeof c.writeRaw === 'function') {
        try {
          await c.writeRaw(0x02, Buffer.from([])); // best-effort poke; attrs already failed
        } catch (_e) { /* continue */ }
      }

      // Path C: stub then retry once (interview-miss compensation)
      if (this._compensation?.stubMissingClusterMethods) {
        this._compensation.stubMissingClusterMethods(c, { clusterId: cluster, epId: found.epId });
        if (typeof c.writeAttributes === 'function') {
          try {
            await c.writeAttributes(attributes || {});
            return true;
          } catch (_e) { /* noop */ }
        }
      }

      return false;
    } catch (err) {
      this._log('writeZcl failed:', err?.message || err);
      return false;
    }
  }

  async configureReporting(ep, cluster, config) {
    try {
      const found = this._resolveClusterMultiEp(ep, cluster);
      if (!found?.cluster || typeof found.cluster.configureReporting !== 'function') {
        // Homey interview often ignores configureReporting → arm poll fallback
        this._log(`configureReporting unavailable ep=${ep} cluster=${cluster} — poll fallback`);
        if (this._compensation?.startReportingPollFallback && typeof config?.pollFn === 'function') {
          return this._compensation.startReportingPollFallback(
            `cfg:${ep}:${cluster}`,
            config.pollFn,
            config.pollIntervalMs || 300000,
          );
        }
        return false;
      }
      try {
        await found.cluster.configureReporting(config || {});
        return true;
      } catch (e) {
        this._log('configureReporting failed, arming poll:', e?.message || e);
        if (this._compensation?.startReportingPollFallback && typeof config?.pollFn === 'function') {
          return this._compensation.startReportingPollFallback(
            `cfg:${ep}:${cluster}`,
            config.pollFn,
            config.pollIntervalMs || 300000,
          );
        }
        return false;
      }
    } catch (err) {
      this._log('configureReporting failed:', err?.message || err);
      return false;
    }
  }

  async bindCluster(ep, cluster) {
    try {
      if (PollControlPolicy
        && PollControlPolicy.isPollControlCluster(cluster)
        && !PollControlPolicy.shouldBindPollControl(this.device)) {
        this._log(`bindCluster: skip pollControl on sleepy ep=${ep}`);
        return false;
      }
      const found = this._resolveClusterMultiEp(ep, cluster);
      if (!found?.cluster) {
        this._log(`bindCluster: cluster missing ep=${ep} cluster=${cluster}`);
        return false;
      }
      if (typeof found.cluster.bind === 'function') {
        try {
          await found.cluster.bind();
          return true;
        } catch (e) {
          this._log('bindCluster bind() failed:', e?.message || e);
        }
      }
      // Alternate: some stacks expose bind on endpoint
      const endpoint = this.device.zclNode?.endpoints?.[found.epId];
      if (endpoint && typeof endpoint.bind === 'function') {
        try {
          await endpoint.bind(cluster);
          return true;
        } catch (_e) { /* noop */ }
      }
      return false;
    } catch (err) {
      this._log('bindCluster failed:', err?.message || err);
      return false;
    }
  }

  // ─── Raw / exotic ────────────────────────────────────────────────────────

  async sendRaw(clusterId, payload, opts = {}) {
    try {
      const preferred = opts.endpoint ?? opts.ep ?? 1;
      const epCandidates = [preferred, 1, 2, 0].filter((v, i, a) => a.indexOf(v) === i);
      const buf = Buffer.isBuffer(payload)
        ? payload
        : Buffer.from(payload || []);
      const cmd = opts.command ?? opts.cmdId ?? 0x00;

      for (const epId of epCandidates) {
        const endpoint = this.device.zclNode?.endpoints?.[epId];
        if (!endpoint) {continue;}

        // Path A: endpoint.sendFrame(clusterId, buf, cmd)
        if (typeof endpoint.sendFrame === 'function') {
          try {
            await endpoint.sendFrame(clusterId, buf, cmd);
            return true;
          } catch (_e) { /* try next shape */ }
        }

        // Path B: endpoint.sendFrame({frameControl, cmdId, data}) object form
        if (typeof endpoint.sendFrame === 'function') {
          try {
            await endpoint.sendFrame({
              clusterId,
              frameControl: [],
              cmdId: cmd,
              data: buf,
            });
            return true;
          } catch (_e) { /* try next */ }
        }

        const cluster = this._resolveCluster(epId, clusterId);
        // Path C: cluster.sendFrame
        if (cluster && typeof cluster.sendFrame === 'function') {
          try {
            await cluster.sendFrame({ frameControl: [], cmdId: cmd, data: buf });
            return true;
          } catch (_e) { /* try next */ }
        }
        // Path D: writeRaw
        if (cluster && typeof cluster.writeRaw === 'function') {
          try {
            await cluster.writeRaw(cmd, buf);
            return true;
          } catch (_e) { /* try next ep */ }
        }
      }

      this._log('sendRaw: no sendFrame/writeRaw available on any endpoint');
      return false;
    } catch (err) {
      this._log('sendRaw failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Tuya magic packet + post-handshake rescan (sleepy-safe, never throws).
   */
  async magicHandshake(opts = {}) {
    try {
      if (typeof sendTuyaMagicPacket !== 'function') {
        this._log('magicHandshake: TuyaMagicPacket unavailable (stub)');
        return false;
      }
      const node = this.device.zclNode;
      if (!node) {
        this._log('magicHandshake: zclNode missing');
        return false;
      }
      const ep = opts.endpoint ?? 1;
      const ok = !!(await sendTuyaMagicPacket(this.device, node, ep, {
        force: opts.force === true,
      }));
      if (ok && opts.rescan !== false) {
        this.defer(async () => {
          await this.ensureTuyaCluster({ endpoint: ep }).catch(() => false);
          await this.scanUnknownClusters(node).catch(() => []);
        }, opts.rescanDelayMs ?? 1500);
      }
      return ok;
    } catch (err) {
      this._log('magicHandshake failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Ensure 0xEF00 is reachable: alias compensation → detect → passive listen.
   * Never invents fingerprints.
   */
  async ensureTuyaCluster(opts = {}) {
    try {
      const epId = opts.endpoint ?? 1;
      if (!this._compensation) {this._attachCompensationLayer(this.device.zclNode);}

      // P113: prefer richer compensated path (magic → delay rescan → bind → stub)
      if (this._compensation && typeof this._compensation.ensureTuyaClusterCompensated === 'function'
        && opts.thin !== true) {
        const ok = !!(await this._compensation.ensureTuyaClusterCompensated({
          ...opts,
          endpoints: opts.endpoints || [epId, 1, 2],
        }).catch(() => false));
        if (ok) {
          this.device._tuyaClusterEnsured = true;
          return true;
        }
      }

      if (this._compensation) {
        try {
          this._compensation.compensateInterviewMiss(this.device.zclNode, {
            extraClusters: [0xEF00],
          });
        } catch (_e) { /* noop */ }
      }

      const resolved = this._compensation?.resolveCluster?.(0xEF00, epId);
      const ep = this.device.zclNode?.endpoints?.[epId];
      const cluster = resolved?.cluster
        || ep?.clusters?.tuya
        || ep?.clusters?.tuyaManufacturer
        || ep?.clusters?.manuSpecificTuya
        || ep?.clusters?.[0xEF00]
        || ep?.clusters?.[61184];
      if (cluster) {
        if (this._compensation) {
          this._compensation.stubMissingClusterMethods(cluster, { clusterId: 0xEF00, epId });
        }
        this.device._tuyaClusterEnsured = true;
        return true;
      }

      // Interview miss: arm passive RX + optional magic (no fake FP / no fake cluster object)
      if (shouldSkipIasOnlyEf00Tx(this.device)) {
        this._log('ensureTuyaCluster skipped (IAS-only)');
        return false;
      }
      this._enablePassiveTuyaListen(opts);
      if (opts.tryMagic !== false) {
        await this.magicHandshake({ endpoint: epId, rescan: false }).catch(() => false);
      }
      this._log('ensureTuyaCluster: 0xEF00 not interviewed — passive listen armed');
      return false;
    } catch (err) {
      this._log('ensureTuyaCluster failed:', err?.message || err);
      return false;
    }
  }

  /**
   * IAS Zone CIE enroll — multi-method cascade (never throws).
   * Paths: fullEnrollmentFlow → writeCie → proactive enroll → reEnroll →
   *        normal mode → multi-ep scan + passive listener.
   */
  async ensureIasEnrolled(opts = {}) {
    try {
      if (!this.channels.ias && opts.force !== true) {
        this._log('ensureIasEnrolled skipped — ias channel disabled');
        return false;
      }
      if (!this._iasEnrollment && IEEEAdvancedEnrollment) {
        this._iasEnrollment = new IEEEAdvancedEnrollment(this.device);
      }
      const adv = this._iasEnrollment;
      if (!adv) {
        this._log('ensureIasEnrolled: IEEEAdvancedEnrollment unavailable');
        return false;
      }

      // Path 1: canonical full flow
      if (typeof adv.fullEnrollmentFlow === 'function') {
        try {
          const ok = !!(await adv.fullEnrollmentFlow(opts));
          if (ok) {
            await this._installIasZoneEnhanced().catch(() => false);
            return true;
          }
        } catch (e) {
          this._log('IAS fullEnrollmentFlow failed:', e?.message || e);
        }
      }

      // Path 2: find cluster + write CIE + proactive enroll
      const found = typeof adv.findIasZoneCluster === 'function'
        ? adv.findIasZoneCluster(this.device.zclNode?.endpoints)
        : null;
      if (found?.cluster) {
        const ias = found.cluster;
        const zoneId = opts.zoneId ?? 10;
        try {
          if (typeof adv.setupEnrollListener === 'function') {
            adv.setupEnrollListener(ias, zoneId);
          }
        } catch (_e) { /* noop */ }
        try {
          if (typeof adv.writeCieAddress === 'function') {
            await adv.writeCieAddress(ias, { maxRetries: 3, verify: true });
          }
        } catch (_e) { /* noop */ }
        try {
          if (typeof adv.sendProactiveEnroll === 'function') {
            await adv.sendProactiveEnroll(ias, zoneId);
          }
        } catch (_e) { /* noop */ }
        try {
          if (typeof adv.reEnrollCie === 'function' && opts.reEnroll !== false) {
            const re = !!(await adv.reEnrollCie(ias));
            if (re) {
              await this._installIasZoneEnhanced().catch(() => false);
              return true;
            }
          }
        } catch (_e) { /* noop */ }
        try {
          if (typeof adv.initiateNormalMode === 'function') {
            await adv.initiateNormalMode(ias);
          }
        } catch (_e) { /* noop */ }
        try {
          if (typeof adv.pollZoneState === 'function') {
            const polled = !!(await adv.pollZoneState(ias, opts.maxWait || 8000));
            if (polled) {
              await this._installIasZoneEnhanced().catch(() => false);
              return true;
            }
          }
        } catch (_e) { /* noop */ }

        // Soft success: listener armed even if zoneState not yet enrolled
        this.device._iasEnrollListenerArmed = true;
        await this._installIasZoneEnhanced().catch(() => false);
        this._log('ensureIasEnrolled: listener armed (zone not yet confirmed)');
        return opts.acceptListenerOnly !== false;
      }

      this._log('ensureIasEnrolled: no iasZone cluster on any endpoint');
      return false;
    } catch (err) {
      this._log('ensureIasEnrolled failed:', err?.message || err);
      return false;
    }
  }

  /**
   * P116: IAS WD (0x0502) — siren/strobe TX, better than per-driver paste.
   * Multi-path: ZigbeeClusterManager → direct cluster → raw frame → Tuya DP.
   * Inspired by ZHA/Z2M warning device quirks; Homey-shaped via DeviceIO.
   */
  async ensureIasWd(opts = {}) {
    try {
      const endpoint = opts.endpoint ?? 1;
      const aliases = ['iasWd', 'ssIasWd', 0x0502, 61186, '61186', '0x0502'];
      const tryEps = [endpoint, 1, 2, 0].filter((v, i, a) => a.indexOf(v) === i);
      for (const epId of tryEps) {
        const ep = this.device.zclNode?.endpoints?.[epId];
        if (!ep?.clusters) {continue;}
        for (const key of aliases) {
          const c = ep.clusters[key];
          if (c) {
            this._iasWd = { endpointId: epId, cluster: c, key };
            this._log(`ensureIasWd: found ${key} on ep=${epId}`);
            return true;
          }
        }
      }
      this._log('ensureIasWd: cluster 0x0502 not interviewed');
      return false;
    } catch (err) {
      this._log('ensureIasWd failed:', err?.message || err);
      return false;
    }
  }

  async startWarning(opts = {}) {
    try {
      if (!this._iasWd?.cluster) {
        await this.ensureIasWd(opts);
      }
      const c = this._iasWd?.cluster;
      const mode = opts.mode ?? 1; // burglar default
      const strobe = opts.strobe ?? 1;
      const sirenLevel = opts.sirenLevel ?? 2;
      const duration = opts.duration ?? 30;
      const warningInfo = (mode & 0x0F) | ((strobe & 0x03) << 4) | ((sirenLevel & 0x03) << 6);

      // Path A: SDK startWarning
      if (c && typeof c.startWarning === 'function') {
        try {
          await c.startWarning({
            warningInfo,
            warningDuration: duration,
            strobeDutyCycle: opts.strobeDutyCycle ?? 50,
            strobeLevel: opts.strobeLevel ?? 1,
          });
          return true;
        } catch (e) {
          this._log('startWarning SDK failed:', e?.message || e);
        }
      }

      // Path B: ZigbeeClusterManager if device has one
      try {
        const zcm = this.device.zigbeeClusterManager || this.device._zigbeeClusterManager;
        if (zcm && typeof zcm.registerIasWd === 'function') {
          await zcm.registerIasWd({ endpoint: this._iasWd?.endpointId ?? 1 });
          if (typeof zcm.startWarning === 'function') {
            const ok = !!(await zcm.startWarning(opts));
            if (ok) {return true;}
          }
        }
      } catch (e) {
        this._log('startWarning ZCM failed:', e?.message || e);
      }

      // Path C: raw ZCL frame (global cmd startWarning = 0x00 on 0x0502)
      try {
        const payload = Buffer.alloc(5);
        payload.writeUInt8(warningInfo & 0xff, 0);
        payload.writeUInt16LE(duration & 0xffff, 1);
        payload.writeUInt8(opts.strobeDutyCycle ?? 50, 3);
        payload.writeUInt8(opts.strobeLevel ?? 1, 4);
        const ok = !!(await this.sendRaw(0x0502, payload, {
          endpoint: this._iasWd?.endpointId ?? opts.endpoint ?? 1,
          command: 0x00,
        }));
        if (ok) {return true;}
      } catch (e) {
        this._log('startWarning raw failed:', e?.message || e);
      }

      // Path D: Tuya DP siren fallback (common DP 13/104/105)
      try {
        const dp = opts.dp ?? 13;
        if (await this.sendDP(dp, true, 'bool')) {return true;}
      } catch (e) {
        this._log('startWarning DP failed:', e?.message || e);
      }

      return false;
    } catch (err) {
      this._log('startWarning failed:', err?.message || err);
      return false;
    }
  }

  async stopWarning(opts = {}) {
    return this.startWarning({
      ...opts,
      mode: 0,
      strobe: 0,
      sirenLevel: 0,
      duration: 0,
    });
  }

  /**
   * Install IASZoneEnhanced (zoneType + status→caps). Historical elevate from
   * UniversalIasDevice era — complements IEEE CIE enrollment.
   * @private
   */
  async _installIasZoneEnhanced() {
    try {
      if (!IASZoneEnhanced) {return false;}
      if (this.device._iasZoneEnhanced?.enrolled || this.device._iasZoneEnhancedInstalled) {
        return true;
      }
      const mgr = new IASZoneEnhanced(this.device);
      const ok = !!(await mgr.initialize(this.device.zclNode));
      if (ok) {
        this.device._iasZoneEnhanced = mgr;
        this.device._iasZoneEnhancedInstalled = true;
        this._log('IASZoneEnhanced installed (zoneType + status handlers)');
      }
      return ok;
    } catch (err) {
      this._log('_installIasZoneEnhanced failed:', err?.message || err);
      return false;
    }
  }

  async scanUnknownClusters(zclNode) {
    try {
      const node = zclNode || this.device.zclNode;
      if (!node || !UnknownClusterHandler?.scanAndBind) {
        this._log('scanUnknownClusters: handler/node unavailable');
        return [];
      }
      const bound = UnknownClusterHandler.scanAndBind(node, this.device) || [];
      this.device.unknownClustersBound = bound;
      if (bound.length > 0) {
        this._log(`Bound ${bound.length} dynamic clusters`);
      }
      return bound;
    } catch (err) {
      this._log('scanUnknownClusters failed:', err?.message || err);
      return [];
    }
  }

  /**
   * Phase 2 orchestrator: magic → EF00 ensure → IAS → queryAll → poll fallback.
   * Safe for deferred onNodeInit; never throws.
   */
  async runInterviewCompensation(opts = {}) {
    const report = {
      magic: false,
      tuyaCluster: false,
      ias: false,
      queryAll: false,
      pollArmed: false,
      quirkGuided: null,
      sleepyPassive: false,
      iasEnhanced: false,
    };
    try {
      if (!this._compensation) {this._attachCompensationLayer(this.device.zclNode);}
      await this.compensateInterview({ runInit: false, ...opts }).catch(() => ({ ok: false }));

      // Era-enrich: quirk-table guided init (magic/query/ias/energy divisors)
      if (opts.quirkGuided !== false && this._compensation?.applyQuirkGuidedInit) {
        report.quirkGuided = await this._compensation.applyQuirkGuidedInit({
          forceMagic: opts.forceMagic === true,
          ...opts,
        }).catch(() => null);
      }

      report.magic = !!(await this.magicHandshake(opts).catch(() => false));
      report.tuyaCluster = !!(await this.ensureTuyaCluster(opts).catch(() => false));

      // Sleepy Tuya "56 years ago" — force passive EF00 listen (docs/rules/SLEEPY_TUYA)
      const mfr = String(
        this.device.getSetting?.('zb_manufacturer_name')
        || this.device.getData?.()?.manufacturerName
        || '',
      );
      const pid = String(
        this.device.getSetting?.('zb_model_id')
        || this.device.getData?.()?.modelId
        || this.device.getData?.()?.productId
        || '',
      );
      const sleepy = opts.forceSleepyPassive === true
        || /^TS02/i.test(pid)
        || /^TS004/i.test(pid)
        || /^TS130/i.test(pid)
        || /^TS0601$/i.test(pid)
        || /^_TZE/i.test(mfr);
      const iasOnlySkip = shouldSkipIasOnlyEf00Tx(this.device);
      if (sleepy && opts.sleepyPassive !== false && !iasOnlySkip) {
        this._enablePassiveTuyaListen(opts);
        try {
          const ef00 = this._ef00();
          if (ef00 && !ef00.passiveMode && typeof ef00._setupPassiveMode === 'function') {
            const ep = this.device.zclNode?.endpoints?.[1] || this.device.zclNode?.endpoints?.[2];
            await ef00._setupPassiveMode(ep, mfr).catch(() => false);
          }
        } catch (_e) { /* noop */ }
        report.sleepyPassive = true;
      }

      const wantsIas = opts.ensureIas !== false && (
        this.device.hasCapability?.('alarm_contact')
        || this.device.hasCapability?.('alarm_motion')
        || this.device.hasCapability?.('alarm_water')
        || this.device.hasCapability?.('alarm_smoke')
        || this.device.hasCapability?.('alarm_generic')
        || this.device.hasCapability?.('alarm_sos')
        || this.device.hasCapability?.('alarm_co')
        || this.device.hasCapability?.('alarm_gas')
        || this.device.hasCapability?.('alarm_fire')
        || opts.forceIas === true
        || /^TS020[2357]/i.test(pid)
        || /^TS021[056]/i.test(pid)
      );
      if (wantsIas) {
        report.ias = !!(await this.ensureIasEnrolled(opts).catch(() => false));
        report.iasEnhanced = !!this.device._iasZoneEnhancedInstalled;
      }

      if (!iasOnlySkip
        && (this.device._protocolInfo?.isTuyaDP || this.protocol === 'hybrid' || opts.queryAll)) {
        report.queryAll = !!(await this.queryAllDPs(opts).catch(() => false));
      }

      if (opts.pollFallback !== false) {
        report.pollArmed = this.startReportingPollFallback(opts.poll || {});
      }

      // Optional MCU negotiate for TS0601
      if (!iasOnlySkip && opts.mcu !== false && typeof this.device.initTuyaMcu === 'function') {
        await this.device.initTuyaMcu().catch(() => {});
      } else if (!iasOnlySkip && opts.mcu !== false) {
        try {
          const TuyaMCUManager = require('../tuya/TuyaMCUManager');
          if (!this.device.tuyaMcuManager) {
            this.device.tuyaMcuManager = new TuyaMCUManager(this.device);
          }
          if (typeof this.device.tuyaMcuManager.negotiate === 'function') {
            await this.device.tuyaMcuManager.negotiate().catch(() => {});
          } else if (typeof this.device.tuyaMcuManager.sendMagicPacket === 'function') {
            await this.device.tuyaMcuManager.sendMagicPacket().catch(() => {});
          }
        } catch (_e) { /* MCU optional */ }
      }

      this.device._ioInterviewReport = report;
      this._log('interview compensation:', JSON.stringify(report));
      return report;
    } catch (err) {
      this._log('runInterviewCompensation failed:', err?.message || err);
      return report;
    }
  }

  /**
   * Sleepy-safe poll when configureReporting is ignored (Z2M onEvent style).
   */
  startReportingPollFallback(opts = {}) {
    try {
      if (this._reportPollTimer) {return true;}
      const intervalMs = opts.intervalMs
        || (this.device.hasCapability?.('measure_battery') ? 4 * 60 * 60 * 1000 : 15 * 60 * 1000);
      const caps = opts.capabilities || ['measure_temperature', 'measure_humidity', 'measure_battery'];
      this._reportPollTimer = safeSetInterval(this.device, async () => {
        try {
          if (this.device._destroyed) {return;}
          if (!shouldSkipIasOnlyEf00Tx(this.device) && this._ef00() && typeof this.queryAllDPs === 'function') {
            await this.queryAllDPs({ silent: true }).catch(() => false);
          }
          for (const cap of caps) {
            if (!this.device.hasCapability?.(cap)) {continue;}
            // Prefer existing ZCL query helper when present
            if (this._zclQuery && typeof this._zclQuery.pollCapability === 'function') {
              // eslint-disable-next-line no-await-in-loop
              await this._zclQuery.pollCapability(cap).catch(() => {});
            }
          }
        } catch (e) {
          this._log('report poll tick failed:', e?.message || e);
        }
      }, intervalMs);
      this.device._ioReportPollArmed = true;
      this._log(`reporting poll fallback armed (${intervalMs}ms)`);
      return true;
    } catch (err) {
      this._log('startReportingPollFallback failed:', err?.message || err);
      return false;
    }
  }

  /**
   * WiFi local-first / cloud channel — P2407: call resolveWiFiTransport helpers
   * (LocalFirstResolver exports functions, not a class — prior path was a no-op).
   * Never invents FPs; never throws.
   */
  async resolveWifi(intent = {}) {
    try {
      if (this.channels.wifi_lan === false && this.channels.wifi_cloud === false) {
        return { ok: false, via: null };
      }
      let resolveWiFiTransport;
      let resolveLanFailureAction;
      let getCloudHealthSnapshot;
      try {
        ({ resolveWiFiTransport, resolveLanFailureAction } = require('../wifi/LocalFirstResolver'));
      } catch (_e) {
        return { ok: false, via: null, error: 'LocalFirstResolver missing' };
      }
      try {
        ({ getCloudHealthSnapshot } = require('../wifi/CloudHealthState'));
      } catch (_e2) {
        getCloudHealthSnapshot = null;
      }

      const settings = (typeof this.device.getSettings === 'function' ? this.device.getSettings() : {}) || {};
      let store = {};
      try {
        store = (typeof this.device.getStoreValue === 'function'
          ? { wifi_connection_policy: this.device.getStoreValue('wifi_connection_policy') }
          : {}) || {};
      } catch (_e3) {
        store = {};
      }
      const health = typeof getCloudHealthSnapshot === 'function' ? getCloudHealthSnapshot() : {};
      const opts = {
        policy: intent.policy || store.wifi_connection_policy || settings.wifi_connection_policy,
        deviceId: intent.deviceId || settings.device_id || settings.id,
        localKey: intent.localKey || settings.local_key,
        ip: intent.ip || settings.ip,
        discoveredIp: intent.discoveredIp || null,
        hasCloudCredentials: intent.hasCloudCredentials === true,
        cloudRateLimited: intent.cloudRateLimited ?? health.cloudRateLimited,
        cloudUnhealthy: intent.cloudUnhealthy ?? health.cloudUnhealthy,
      };

      const decision = resolveWiFiTransport(opts);
      let failure = null;
      if (intent.lanFailed === true && typeof resolveLanFailureAction === 'function') {
        failure = resolveLanFailureAction(opts);
      }
      const ok = decision.transport === 'lan' || decision.transport === 'cloud';
      return {
        ok,
        via: 'local_first',
        result: failure ? { ...decision, failure } : decision,
      };
    } catch (err) {
      this._log('resolveWifi failed:', err?.message || err);
      return { ok: false, via: null, error: err?.message };
    }
  }

  /**
   * Optional deferred helper for sleepy-safe follow-ups (Phase 2 poll fallback).
   */
  defer(fn, ms = 1000) {
    try {
      return safeSetTimeout(this.device, () => {
        Promise.resolve(fn()).catch((e) => this._log('defer task failed:', e?.message || e));
      }, ms);
    } catch (_e) {
      return null;
    }
  }
}

/**
 * Install façade on a device instance (constructor / early onNodeInit).
 * @param {object} device
 * @returns {DeviceIOFacade}
 */
// WHY(P2338): stable-v5 may lag master on fusion hooks — optional attach keeps io:smoke green.
try {
  const { attachDeviceFusionHooks } = require('./DeviceFusionHooks');
  if (typeof attachDeviceFusionHooks === 'function') {
    attachDeviceFusionHooks(DeviceIOFacade.prototype);
  }
} catch (hookErr) {
  // eslint-disable-next-line no-console
  console.warn('[DeviceIOFacade] DeviceFusionHooks unavailable:', hookErr?.message || hookErr);
}

function installDeviceIO(device) {
  if (device.io instanceof DeviceIOFacade) {
    return device.io;
  }
  const io = new DeviceIOFacade(device);
  device.io = io;
  return io;
}

module.exports = DeviceIOFacade;
module.exports.DeviceIOFacade = DeviceIOFacade;
module.exports.installDeviceIO = installDeviceIO;
module.exports.shouldSkipIasOnlyEf00Tx = shouldSkipIasOnlyEf00Tx;
module.exports.DEFAULT_CHANNELS = DEFAULT_CHANNELS;
module.exports.HomeyCompensationLayer = HomeyCompensationLayer;
module.exports.ProtocolFallbackChain = ProtocolFallbackChain;
module.exports.loadProtocolQuirkTable = loadProtocolQuirkTable;
