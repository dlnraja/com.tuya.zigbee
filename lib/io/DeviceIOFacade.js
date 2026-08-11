'use strict';

/**
 * DeviceIOFacade (P102 Phase 1)
 *
 * Single outbound/inbound I/O surface for TuyaZigbeeDevice and Unified* bases.
 * Wraps existing managers — does not reimplement protocol engines.
 *
 * Safety contract: missing cluster / manager → return false|null + log.
 * Never throw fatal during init or routine I/O.
 *
 * Phase 2–4: interview compensation + battery/button/SOS/scene fusion + exotic hooks.
 */

const { safeSetTimeout, safeSetInterval } = require('../utils/safe-timers');

let sendTuyaMagicPacket;
try {
  ({ sendTuyaMagicPacket } = require('../zigbee/TuyaMagicPacket'));
} catch (_e) {
  sendTuyaMagicPacket = null;
}

let BatteryRouter;
try {
  BatteryRouter = require('../helpers/BatteryRouter');
} catch (_e) {
  BatteryRouter = null;
}

let UnifiedBatteryHandler;
try {
  UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');
} catch (_e) {
  UnifiedBatteryHandler = null;
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

      // 2) Raw sendFrame (best-effort datapoint write framing)
      try {
        const rawOk = await this._sendDpViaRawFrame(dp, value, dpType, opts);
        if (rawOk) {return true;}
      } catch (e) {
        this._log('sendDP raw frame failed:', e?.message || e);
      }

      // 3) Magic handshake then one soft retry (manager only)
      try {
        const magic = await this.magicHandshake({ endpoint: opts.endpoint ?? 1 });
        if (magic && ef00 && typeof ef00.sendDP === 'function') {
          const retry = !!(await ef00.sendDP(dp, value, dpType, opts));
          if (retry) {return true;}
        }
      } catch (e) {
        this._log('sendDP magic retry failed:', e?.message || e);
      }

      // 4) Rescan / ensure cluster then retry
      try {
        await this.ensureTuyaCluster({ endpoint: opts.endpoint ?? 1 });
        await this.scanUnknownClusters(this.device.zclNode);
        const ef00b = this._ef00();
        if (ef00b && typeof ef00b.sendDP === 'function') {
          const retry2 = !!(await ef00b.sendDP(dp, value, dpType, opts));
          if (retry2) {return true;}
        }
      } catch (e) {
        this._log('sendDP rescan retry failed:', e?.message || e);
      }

      // 5) Passive — mark for RX-only path; never throw
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
    } else if (typeId === 2 || typeId === 4 || typeId === 5) {
      const n = Number(value) >>> 0;
      dataBuf = Buffer.alloc(4);
      dataBuf.writeUInt32BE(n, 0);
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
      if (!node || typeof node.handleFrame !== 'function') {return true;}
      if (this.device._ioPassiveFrameHooked) {return true;}
      const prev = node.handleFrame.bind(node);
      const device = this.device;
      node.handleFrame = (frame) => {
        try {
          const cid = frame?.clusterId ?? frame?.cluster;
          if (cid === 0xEF00 || cid === 61184) {
            const mgr = device.tuyaEF00Manager;
            if (mgr && typeof mgr.handleIncomingFrame === 'function') {
              Promise.resolve(mgr.handleIncomingFrame(frame)).catch(() => {});
            } else if (mgr && typeof mgr.parseIncomingFrame === 'function') {
              Promise.resolve(mgr.parseIncomingFrame(frame)).catch(() => {});
            }
          }
        } catch (_e) { /* noop */ }
        return prev(frame);
      };
      device._ioPassiveFrameHooked = true;
      this._log('passive Tuya EF00 listen armed');
      return true;
    } catch (e) {
      this._log('passive listen arm failed:', e?.message || e);
      return false;
    }
  }

  async requestDP(dp, opts = {}) {
    try {
      const ef00 = this._ef00();
      if (!ef00 || typeof ef00.requestDP !== 'function') {
        this._log('requestDP: TuyaEF00Manager unavailable');
        return false;
      }
      return !!(await ef00.requestDP(dp, opts));
    } catch (err) {
      this._log('requestDP failed:', err?.message || err);
      return false;
    }
  }

  async queryAllDPs(opts = {}) {
    try {
      const ef00 = this._ef00();
      if (!ef00) {
        this._log('queryAllDPs: TuyaEF00Manager unavailable');
        return false;
      }
      if (typeof ef00.queryAllDatapoints === 'function') {
        return !!(await ef00.queryAllDatapoints(opts));
      }
      if (typeof ef00.requestAllDPs === 'function') {
        return !!(await ef00.requestAllDPs(opts));
      }
      this._log('queryAllDPs: no requestAllDPs/queryAllDatapoints on manager');
      return false;
    } catch (err) {
      this._log('queryAllDPs failed:', err?.message || err);
      return false;
    }
  }

  // ─── ZCL ─────────────────────────────────────────────────────────────────

  _resolveCluster(endpointId, cluster) {
    const epId = endpointId == null ? 1 : endpointId;
    const ep = this.device.zclNode?.endpoints?.[epId];
    if (!ep?.clusters) {return null;}
    if (typeof cluster === 'number') {
      return ep.clusters[cluster]
        || ep.clusters[`0x${cluster.toString(16)}`]
        || ep.clusters[String(cluster)]
        || null;
    }
    return ep.clusters[cluster]
      || ep.clusters[String(cluster).toLowerCase()]
      || null;
  }

  async readZcl(ep, cluster, attrs) {
    try {
      const c = this._resolveCluster(ep, cluster);
      if (!c || typeof c.readAttributes !== 'function') {
        this._log(`readZcl: cluster missing ep=${ep} cluster=${cluster}`);
        return null;
      }
      const list = Array.isArray(attrs) ? attrs : [attrs];
      return await c.readAttributes(list);
    } catch (err) {
      this._log('readZcl failed:', err?.message || err);
      return null;
    }
  }

  async writeZcl(ep, cluster, attributes) {
    try {
      const c = this._resolveCluster(ep, cluster);
      if (!c || typeof c.writeAttributes !== 'function') {
        this._log(`writeZcl: cluster missing ep=${ep} cluster=${cluster}`);
        return false;
      }
      await c.writeAttributes(attributes || {});
      return true;
    } catch (err) {
      this._log('writeZcl failed:', err?.message || err);
      return false;
    }
  }

  async configureReporting(ep, cluster, config) {
    try {
      const c = this._resolveCluster(ep, cluster);
      if (!c || typeof c.configureReporting !== 'function') {
        this._log(`configureReporting: cluster missing ep=${ep} cluster=${cluster}`);
        return false;
      }
      await c.configureReporting(config || {});
      return true;
    } catch (err) {
      this._log('configureReporting failed:', err?.message || err);
      return false;
    }
  }

  async bindCluster(ep, cluster) {
    try {
      const c = this._resolveCluster(ep, cluster);
      if (!c || typeof c.bind !== 'function') {
        this._log(`bindCluster: cluster missing ep=${ep} cluster=${cluster}`);
        return false;
      }
      await c.bind();
      return true;
    } catch (err) {
      this._log('bindCluster failed:', err?.message || err);
      return false;
    }
  }

  // ─── Raw / exotic ────────────────────────────────────────────────────────

  async sendRaw(clusterId, payload, opts = {}) {
    try {
      const epId = opts.endpoint ?? opts.ep ?? 1;
      const endpoint = this.device.zclNode?.endpoints?.[epId];
      if (!endpoint) {
        this._log(`sendRaw: endpoint ${epId} missing`);
        return false;
      }
      const buf = Buffer.isBuffer(payload)
        ? payload
        : Buffer.from(payload || []);

      if (typeof endpoint.sendFrame === 'function') {
        const cmd = opts.command ?? opts.cmdId ?? 0x00;
        await endpoint.sendFrame(clusterId, buf, cmd);
        return true;
      }

      const cluster = this._resolveCluster(epId, clusterId);
      if (cluster && typeof cluster.writeRaw === 'function') {
        await cluster.writeRaw(opts.command ?? 0x00, buf);
        return true;
      }

      this._log('sendRaw: no sendFrame/writeRaw available');
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
   * IAS Zone CIE enroll via IEEEAdvancedEnrollment (SOS / contact / motion).
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
      if (!this._iasEnrollment || typeof this._iasEnrollment.fullEnrollmentFlow !== 'function') {
        this._log('ensureIasEnrolled: IEEEAdvancedEnrollment unavailable');
        return false;
      }
      return !!(await this._iasEnrollment.fullEnrollmentFlow(opts));
    } catch (err) {
      this._log('ensureIasEnrolled failed:', err?.message || err);
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

      const wantsIas = opts.ensureIas !== false && (
        this.device.hasCapability?.('alarm_contact')
        || this.device.hasCapability?.('alarm_motion')
        || this.device.hasCapability?.('alarm_water')
        || this.device.hasCapability?.('alarm_smoke')
        || this.device.hasCapability?.('alarm_generic')
        || this.device.hasCapability?.('alarm_sos')
        || opts.forceIas === true
      );
      if (wantsIas) {
        report.ias = !!(await this.ensureIasEnrolled(opts).catch(() => false));
      }

      if (this.device._protocolInfo?.isTuyaDP || this.protocol === 'hybrid' || opts.queryAll) {
        report.queryAll = !!(await this.queryAllDPs(opts).catch(() => false));
      }

      if (opts.pollFallback !== false) {
        report.pollArmed = this.startReportingPollFallback(opts.poll || {});
      }

      // Optional MCU negotiate for TS0601
      if (opts.mcu !== false && typeof this.device.initTuyaMcu === 'function') {
        await this.device.initTuyaMcu().catch(() => {});
      } else if (opts.mcu !== false) {
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
          if (this._ef00() && typeof this.queryAllDPs === 'function') {
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

  // ─── Fusion: battery / buttons / SOS / scenes ────────────────────────────

  /**
   * Fuse BatteryRouter + UnifiedBatteryHandler into one RX commit path.
   * Bans linear (v-2.5)/0.5 — always uses UnifiedBatteryHandler curves.
   */
  async fuseBattery(dpOrAttr, value, meta = {}) {
    try {
      const device = this.device;
      if (!device?.hasCapability?.('measure_battery') && meta.force !== true) {
        return false;
      }

      let percent = null;
      const source = meta.source || 'io-fuse-battery';

      if (meta.kind === 'voltage' || meta.isVoltage) {
        if (!UnifiedBatteryHandler) {return false;}
        const voltage = UnifiedBatteryHandler.normalizeVoltage(value);
        const chem = BatteryRouter?.getRecommendedBatteryType?.(device)
          || meta.batteryType
          || 'CR2032';
        percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, chem);
      } else if (typeof dpOrAttr === 'number' || /^\d+$/.test(String(dpOrAttr))) {
        const dp = Number(dpOrAttr);
        if (UnifiedBatteryHandler?.normalizeTuyaBatteryValue) {
          const profile = UnifiedBatteryHandler.lookupBatteryProfile?.(
            device.getSetting?.('zb_manufacturer_name'),
            device.getSetting?.('zb_model_id'),
          );
          percent = UnifiedBatteryHandler.normalizeTuyaBatteryValue(dp, value, {
            profile,
            manufacturerName: device.getSetting?.('zb_manufacturer_name'),
          });
        }
      } else if (UnifiedBatteryHandler?.normalizeZigbeeValue) {
        percent = UnifiedBatteryHandler.normalizeZigbeeValue(value);
      } else if (typeof value === 'number') {
        percent = value > 100 ? Math.round(value / 2) : Math.round(value);
      }

      if (percent == null || Number.isNaN(percent)) {return false;}
      percent = Math.max(0, Math.min(100, Math.round(percent)));

      if (UnifiedBatteryHandler?.shouldCommitBatteryValue) {
        const okCommit = UnifiedBatteryHandler.shouldCommitBatteryValue(device, percent, { source });
        if (okCommit === false) {return false;}
      }

      if (typeof device.safeSetCapabilityValue === 'function') {
        await device.safeSetCapabilityValue('measure_battery', percent);
      } else if (typeof device.setCapabilityValue === 'function') {
        await device.setCapabilityValue('measure_battery', percent);
      } else {
        return false;
      }
      this._log(`fuseBattery → ${percent}% (${source})`);
      return true;
    } catch (err) {
      this._log('fuseBattery failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Fuse PhysicalButtonMixin + VirtualButtonMixin + NamedButtonFallback.
   * event: { gang, pressType } | number gang | string pressType
   */
  async fuseButton(event, meta = {}) {
    try {
      const device = this.device;
      let gang = meta.gang ?? 1;
      let pressType = meta.pressType || meta.type || 'single';

      if (event && typeof event === 'object') {
        gang = event.gang ?? event.button ?? event.endpoint ?? gang;
        pressType = event.pressType || event.type || event.action || pressType;
      } else if (typeof event === 'number') {
        gang = event;
      } else if (typeof event === 'string') {
        pressType = event;
      }

      if (typeof device._triggerPhysicalFlow === 'function' && meta.virtual !== true) {
        device._triggerPhysicalFlow(gang, pressType, meta.tokens || {});
        return true;
      }
      if (typeof device.triggerButtonPress === 'function') {
        await device.triggerButtonPress(gang, pressType, meta.clicks || 1, {
          source: meta.source || 'io-fuse-button',
        });
        return true;
      }
      if (meta.virtual === true && typeof device._handleVirtualToggle === 'function') {
        await device._handleVirtualToggle(gang, meta);
        return true;
      }

      const cap = gang > 1 ? `button.${gang}` : 'button';
      if (typeof device.safeSetCapabilityValue === 'function' && device.hasCapability?.(cap)) {
        await device.safeSetCapabilityValue(cap, true);
        this.defer(() => device.safeSetCapabilityValue(cap, false).catch(() => {}), 200);
        return true;
      }
      return false;
    } catch (err) {
      this._log('fuseButton failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Fuse SOS via IAS ACE emergency/panic or IAS Zone alarm bits.
   */
  async fuseSos(zoneStatus, meta = {}) {
    try {
      const device = this.device;
      let active = false;
      if (typeof zoneStatus === 'boolean') {
        active = zoneStatus;
      } else if (zoneStatus && typeof zoneStatus === 'object') {
        active = !!(zoneStatus.alarm1 || zoneStatus.alarm2 || zoneStatus.emergency
          || zoneStatus.panic || meta.emergency || meta.panic);
      } else if (meta.emergency || meta.panic) {
        active = true;
      }

      const caps = ['alarm_sos', 'alarm_generic', 'alarm_contact']
        .filter((c) => device.hasCapability?.(c));
      if (!caps.length && meta.forceCapability) {
        caps.push(meta.forceCapability);
      }
      if (!caps.length) {return false;}

      for (const cap of caps) {
        if (typeof device.safeSetCapabilityValue === 'function') {
          // eslint-disable-next-line no-await-in-loop
          await device.safeSetCapabilityValue(cap, active);
        } else if (typeof device.setCapabilityValue === 'function') {
          // eslint-disable-next-line no-await-in-loop
          await device.setCapabilityValue(cap, active);
        }
      }

      if (active && typeof device._triggerPhysicalFlow === 'function' && meta.triggerFlow !== false) {
        device._triggerPhysicalFlow(meta.gang || 1, 'sos', { sos: true });
      }
      return true;
    } catch (err) {
      this._log('fuseSos failed:', err?.message || err);
      return false;
    }
  }

  /**
   * MultistateInput / genScenes recall → button/scene flow.
   */
  async fuseScene(sceneId, meta = {}) {
    try {
      const device = this.device;
      const id = sceneId?.sceneId ?? sceneId?.sceneGroup ?? sceneId;
      const gang = meta.gang || meta.button || Number(id) || 1;
      const pressType = meta.pressType || meta.action || 'single';

      if (typeof device._triggerPhysicalFlow === 'function') {
        device._triggerPhysicalFlow(gang, pressType, {
          sceneId: id,
          source: 'io-fuse-scene',
          ...(meta.tokens || {}),
        });
        return true;
      }
      return this.fuseButton({ gang, pressType }, { ...meta, source: 'io-fuse-scene' });
    } catch (err) {
      this._log('fuseScene failed:', err?.message || err);
      return false;
    }
  }

  // ─── Phase 4 exotic profile hooks ────────────────────────────────────────

  /**
   * Write Tuya E001 attrs (switchMode / powerOnBehavior) via io.writeZcl.
   */
  async writeE00x(attrName, value, opts = {}) {
    try {
      const ep = opts.endpoint ?? 1;
      const cluster = opts.cluster ?? 0xE001;
      const map = {
        switchMode: { switchMode: value },
        powerOnBehavior: { powerOnBehavior: value },
        backlight: { backlightMode: value },
      };
      const attrs = opts.attributes || map[attrName] || { [attrName]: value };
      const ok = await this.writeZcl(ep, cluster, attrs);
      if (!ok && cluster === 0xE001) {
        // Fallback numeric attr ids used by some stacks
        return this.writeZcl(ep, 0xE001, attrs);
      }
      return ok;
    } catch (err) {
      this._log('writeE00x failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Subscribe IR binder events when Zosung clusters present (profile opt-in).
   */
  async subscribeIrBinder(opts = {}) {
    try {
      const epId = opts.endpoint ?? 1;
      const ep = this.device.zclNode?.endpoints?.[epId];
      if (!ep?.clusters) {return false;}
      const ir = ep.clusters.zosungIRControl
        || ep.clusters[0xE004]
        || ep.clusters[57348]
        || ep.clusters.zosungIRTransmit
        || ep.clusters[0xED00];
      if (!ir) {
        this._log('subscribeIrBinder: no IR cluster');
        return false;
      }
      if (this._binder && typeof this._binder.subscribeCluster === 'function') {
        await this._binder.subscribeCluster(epId, ir);
      }
      this.device._irBinderSubscribed = true;
      this._log('IR binder subscribed');
      return true;
    } catch (err) {
      this._log('subscribeIrBinder failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Cover calibration hooks — route through UnifiedCoverBase / DP10 when present.
   */
  async coverCalibration(action = 'start', opts = {}) {
    try {
      const device = this.device;
      if (typeof device.startCalibration === 'function' && action === 'start') {
        await device.startCalibration(opts);
        return true;
      }
      if (typeof device.stopCalibration === 'function' && action === 'stop') {
        await device.stopCalibration(opts);
        return true;
      }
      // DP10 calibration_time (seconds) — set when opts.seconds provided
      if (opts.seconds != null) {
        return this.sendDP(10, Number(opts.seconds) || 0, { type: 'value', ...opts });
      }
      if (opts.reverse != null) {
        return this.sendDP(5, opts.reverse ? 1 : 0, { type: 'enum', ...opts });
      }
      this._log('coverCalibration: no handler / seconds');
      return false;
    } catch (err) {
      this._log('coverCalibration failed:', err?.message || err);
      return false;
    }
  }

  /**
   * Apply a named exotic profile from data/exotic_cluster_profiles.json (opt-in).
   * Never auto-maps unknown clusters to capabilities — listen/bind only.
   */
  async applyExoticProfile(profileId, opts = {}) {
    try {
      if (!profileId) {return false;}
      const fs = require('fs');
      const path = require('path');
      const p = path.join(__dirname, '..', '..', 'data', 'exotic_cluster_profiles.json');
      if (!fs.existsSync(p)) {
        this._log('applyExoticProfile: profiles file missing');
        return false;
      }
      const table = JSON.parse(fs.readFileSync(p)); // Buffer→parse RAM-safe via Node buffer ok when stringified small
      const profile = table?.profiles?.[profileId];
      if (!profile) {
        this._log('applyExoticProfile: unknown', profileId);
        return false;
      }
      const results = { profileId, actions: {} };
      const actions = profile.actions || [];
      for (const action of actions) {
        if (action === 'subscribeIrBinder') {
          // eslint-disable-next-line no-await-in-loop
          results.actions[action] = !!(await this.subscribeIrBinder(opts).catch(() => false));
        } else if (action === 'coverCalibration' && opts.coverAction) {
          // eslint-disable-next-line no-await-in-loop
          results.actions[action] = !!(await this.coverCalibration(opts.coverAction, opts).catch(() => false));
        } else if (action === 'startReportingPollFallback') {
          results.actions[action] = !!this.startReportingPollFallback(opts.poll || {});
        } else if (action === 'writeE00x' && opts.attrName != null) {
          // eslint-disable-next-line no-await-in-loop
          results.actions[action] = !!(await this.writeE00x(opts.attrName, opts.value, opts).catch(() => false));
        } else if (action === 'fuseScene' || action === 'fuseButton') {
          results.actions[action] = 'armed';
        } else {
          results.actions[action] = 'skipped';
        }
      }
      this.device._exoticProfile = results;
      this._log('exotic profile applied:', profileId, JSON.stringify(results.actions));
      return true;
    } catch (err) {
      this._log('applyExoticProfile failed:', err?.message || err);
      return false;
    }
  }

  /**
   * WiFi local-first / cloud channel — delegates to LocalFirstResolver when present.
   * Never invents FPs; never throws.
   */
  async resolveWifi(intent = {}) {
    try {
      if (this.channels.wifi_lan === false && this.channels.wifi_cloud === false) {
        return { ok: false, via: null };
      }
      let LocalFirstResolver;
      try {
        LocalFirstResolver = require('../wifi/LocalFirstResolver');
      } catch (_e) {
        return { ok: false, via: null, error: 'LocalFirstResolver missing' };
      }
      const Resolver = LocalFirstResolver.LocalFirstResolver || LocalFirstResolver;
      if (typeof Resolver !== 'function' && typeof Resolver.resolve !== 'function') {
        // Module may export singleton helpers
        if (typeof LocalFirstResolver.resolve === 'function') {
          const r = await LocalFirstResolver.resolve(this.device, intent);
          return { ok: !!r, via: 'local_first', result: r };
        }
        return { ok: false, via: null };
      }
      if (!this.device._localFirstResolver && typeof Resolver === 'function') {
        try {
          this.device._localFirstResolver = new Resolver(this.device);
        } catch (_e) {
          this.device._localFirstResolver = null;
        }
      }
      const inst = this.device._localFirstResolver;
      if (inst && typeof inst.resolve === 'function') {
        const r = await inst.resolve(intent);
        return { ok: !!r, via: 'local_first', result: r };
      }
      if (inst && typeof inst.sendCommand === 'function' && intent.command) {
        const r = await inst.sendCommand(intent.command, intent.payload);
        return { ok: !!r, via: 'local_first_cmd', result: r };
      }
      return { ok: false, via: null };
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
module.exports.DEFAULT_CHANNELS = DEFAULT_CHANNELS;
module.exports.HomeyCompensationLayer = HomeyCompensationLayer;
module.exports.ProtocolFallbackChain = ProtocolFallbackChain;
module.exports.loadProtocolQuirkTable = loadProtocolQuirkTable;
