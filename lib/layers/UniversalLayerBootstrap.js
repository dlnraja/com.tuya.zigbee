'use strict';

/**
 * UniversalLayerBootstrap — soft-attach proprietary protocol layers
 * that Unified* bases already wire, but bare TuyaZigbeeDevice lineages
 * (lights, IR, DIY, TuyaSpecificCluster) often miss.
 *
 * Never throws. Idempotent.
 *
 * Layers touched:
 *  - IntelligentProtocolDetect (ZCL ↔ EF00 hybrid decision — P214)
 *  - ProtocolAutoOptimizer (DP vs ZCL learning)
 *  - IntelligentProtocolRouter (proprietary overlay detect)
 *  - TuyaEF00Manager (on-demand when EF00 / hybrid)
 *  - GlobalTimeSyncEngine (EF00 / MCU time, only if cluster present)
 *  - CrossLayerRedundancy (unsupported cache + multi-source confirm + RX dedup)
 *  - ProtocolRxTxChain (inventory + cascade DP/ZCL/bound/raw/MCU/IAS)
 *  - DPAdaptationEngine (real-time DP pattern learning — wired to dpReport stream)
 *  - DynamicCapabilityManager (runtime capability discovery on unknown DPs)
 */

/**
 * Wire DPAdaptationEngine + DynamicCapabilityManager + IntelligentDriverHotSwap
 * into the live dpReport stream emitted by TuyaEF00Manager.
 * Safe to call multiple times — idempotent.
 *
 * Integration contract (v2):
 *  - All value writes from dynamic caps → device.safeSetCapabilityValue() only.
 *  - hotSwap.guardCapabilitySource() prevents ZCL + EF00 double-write on same cap.
 *  - hotSwap.observeCapabilityValue() tracks staleness for coherence cleanup.
 *  - DynamicCapabilityManager._ensureCapability() calls hotSwap.hotSwapAddCapability()
 *    instead of addCapability() directly (patched below after construction).
 *
 * Classification: BOTH (crash-safe, non-blocking, store-persisted).
 */
async function _bootDynamicAdaptation(device) {
  if (!device || device._destroyed || device._dynamicAdaptationBooted) return;
  device._dynamicAdaptationBooted = true;

  const ef00 = device.tuyaEF00Manager;
  if (!ef00 || typeof ef00.on !== 'function') return; // no EF00 = no DP stream to hook

  // ── 1. IntelligentDriverHotSwap (init first — DynamicCapabilityManager delegates to it) ──
  if (!device.hotSwap) {
    try {
      const IntelligentDriverHotSwap = require('../dynamic/IntelligentDriverHotSwap');
      device.hotSwap = new IntelligentDriverHotSwap(device);
      await device.hotSwap.initialize().catch(() => {});
    } catch (e) {
      try { device.log?.(`[LAYERS] IntelligentDriverHotSwap skip: ${e.message}`); } catch { /* noop */ }
    }
  }

  // ── 2. DPAdaptationEngine ──
  if (!device.dpAdaptationEngine) {
    try {
      const DPAdaptationEngine = require('../dynamic/DPAdaptationEngine');
      device.dpAdaptationEngine = new DPAdaptationEngine(device);
      await device.dpAdaptationEngine.initialize().catch(() => {});
    } catch (e) {
      try { device.log?.(`[LAYERS] DPAdaptationEngine skip: ${e.message}`); } catch { /* noop */ }
    }
  }

  // ── 3. DynamicCapabilityManager — patch _ensureCapability to route through hotSwap ──
  if (!device.dynamicCapabilityManager) {
    try {
      const DynamicCapabilityManager = require('../dynamic/DynamicCapabilityManager');
      const mgr = new DynamicCapabilityManager(device);
      await mgr.initialize().catch(() => {});

      // Patch: delegate _ensureCapability to hotSwap (single addCapability authority)
      if (device.hotSwap && typeof mgr._ensureCapability === 'function') {
        const origEnsure = mgr._ensureCapability.bind(mgr);
        mgr._ensureCapability = async (capabilityId) => {
          if (device._destroyed) return false;
          // Route through hotSwap which applies budget + coherence + computed-remap guards
          if (device.hotSwap) {
            return device.hotSwap.hotSwapAddCapability(capabilityId, 0.8).catch(() => false);
          }
          return origEnsure(capabilityId);
        };
      }
      device.dynamicCapabilityManager = mgr;
    } catch (e) {
      try { device.log?.(`[LAYERS] DynamicCapabilityManager skip: ${e.message}`); } catch { /* noop */ }
    }
  }

  // ── 4. Wire dpReport stream ──────────────────────────────────────────────────
  ef00.on('dpReport', ({ dpId, value, dpType }) => {
    if (device._destroyed) return;

    // 4a. DP pattern learning
    try { device.dpAdaptationEngine?.analyzeDP?.(dpId, value, dpType); } catch { /* non-blocking */ }

    // 4b. Dynamic capability discovery
    try { device.dynamicCapabilityManager?.processDP?.(dpId, value, dpType); } catch { /* non-blocking */ }

    // 4c. Hot-swap: observe DP → may commit routing override after MIN_OBSERVATIONS
    try {
      if (device.hotSwap && device.dynamicCapabilityManager) {
        const mapping = device.dynamicCapabilityManager._discoveredDPs?.get(dpId);
        if (mapping?.capability && typeof mapping.confidence === 'number') {
          device.hotSwap.observeDP(dpId, value, mapping.capability, mapping.confidence / 100).catch(() => {});
        }
      }
    } catch { /* non-blocking */ }

    // 4d. Source guard: EF00 DP is 'tuya_dp' source priority
    try {
      const routedCap = device.hotSwap?.applyDPRouting?.(dpId);
      if (routedCap && device.hotSwap) {
        const allowed = device.hotSwap.guardCapabilitySource(routedCap, 'tuya_dp');
        if (allowed) {
          // Notify coherence tracker that we saw a value for this dynamic cap
          device.hotSwap.observeCapabilityValue(routedCap, value);
        }
      }
    } catch { /* non-blocking */ }

    // 4e. Protocol frame counting (Strategy 3)
    try { device.hotSwap?.observeFrame?.('ef00'); } catch { /* non-blocking */ }
  });

  // ── 5. ZCL frame counting for protocol renegotiation ─────────────────────────
  // Also source-guard ZCL: ZCL reports take priority over EF00 DP for same cap.
  ef00.on('zclReport', ({ capability, value } = {}) => {
    if (device._destroyed) return;
    try { device.hotSwap?.observeFrame?.('zcl'); } catch { /* non-blocking */ }
    try {
      if (capability && device.hotSwap) {
        device.hotSwap.guardCapabilitySource(capability, 'zcl');
        device.hotSwap.observeCapabilityValue(capability, value);
      }
    } catch { /* non-blocking */ }
  });

  try {
    device.log?.('[LAYERS] DynamicAdaptation v2 + IntelligentDriverHotSwap wired (source-guard + coherence active)');
  } catch { /* noop */ }
}

async function bootstrapUniversalLayers(device, zclNode) {
  if (!device || device._destroyed || device._universalLayersBootstrapped) {
    return { skipped: true };
  }
  device._universalLayersBootstrapped = true;
  const node = zclNode || device.zclNode;
  const out = {
    optimizer: false,
    router: false,
    timeSync: false,
    protocol: false,
    ef00: false,
  };

  // P214: intelligent ZCL ↔ EF00 detection for EVERY lineage (Unified* may re-run)
  try {
    const { applyIntelligentProtocol } = require('../protocol/IntelligentProtocolDetect');
    const info = applyIntelligentProtocol(device, node);
    out.protocol = true;
    out.protocolMode = info.protocol;
    out.reason = info.reason;
    try {
      device.log?.(
        `[LAYERS] Protocol ${info.protocol} (${info.reason}) `
        + `ef00=${!!info.hasTuyaCluster} zcl=${!!info.hasZclClusters} `
        + `hybridListen=${!!info.listenHybrid}`,
      );
    } catch { /* noop */ }
  } catch (e) {
    try { device.log?.(`[LAYERS] ProtocolDetect skip: ${e.message}`); } catch { /* noop */ }
  }

  // Soft-attach TuyaEF00Manager when EF00 is present, or MCU/_TZE heuristics need
  // passive DP listen. Never on sacred zcl_only. Never on default hybrid with no EF00
  // (plain _TZ3000 ZCL switches must stay ZCL-first).
  if (!device.tuyaEF00Manager) {
    const info = device._protocolInfo || {};
    const zclOnly = String(info.protocol || '').toLowerCase() === 'zcl_only'
      || String(device._manufacturerConfig?.protocol || '').toLowerCase() === 'zcl_only';
    const wantEf00 = !!(
      info.hasTuyaCluster
      || info.protocol === 'TUYA_DP'
      || (info.listenHybrid && info.preferDpTx)
    );
    if (wantEf00 && !zclOnly) {
      try {
        const TuyaEF00Manager = require('../tuya/TuyaEF00Manager');
        device.tuyaEF00Manager = new TuyaEF00Manager(device);
        if (typeof device.tuyaEF00Manager.initialize === 'function' && node) {
          await device.tuyaEF00Manager.initialize(node).catch(() => {});
        }
        out.ef00 = true;
      } catch (e) {
        try { device.log?.(`[LAYERS] TuyaEF00Manager soft-attach skip: ${e.message}`); } catch { /* noop */ }
      }
    }
  }

  // ProtocolAutoOptimizer — already on UnifiedSwitch/Sensor/Light
  if (!device.protocolOptimizer) {
    try {
      const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
      device.protocolOptimizer = new ProtocolAutoOptimizer(device, { verbose: false });
      if (typeof device.protocolOptimizer.initialize === 'function' && node) {
        await device.protocolOptimizer.initialize(node);
      }
      out.optimizer = true;
    } catch (e) {
      try { device.log?.(`[LAYERS] ProtocolAutoOptimizer skip: ${e.message}`); } catch { /* noop */ }
    }
  }

  // IntelligentProtocolRouter — proprietary overlay (Xiaomi/IKEA/Tuya/…)
  if (!device.protocolRouter) {
    try {
      const IntelligentProtocolRouter = require('../protocol/IntelligentProtocolRouter');
      device.protocolRouter = new IntelligentProtocolRouter(device);
      if (typeof device.protocolRouter.detectProtocol === 'function') {
        await device.protocolRouter.detectProtocol(node).catch(() => {});
      } else if (typeof device.protocolRouter.detectProprietaryOverlay === 'function') {
        const mfr = device.getSetting?.('zb_manufacturer_name')
          || device.getStoreValue?.('manufacturerName')
          || device.getData?.()?.manufacturerName;
        device.protocolRouter.detectProprietaryOverlay(mfr);
        if (typeof device.protocolRouter.detectProprietaryClusters === 'function') {
          device.protocolRouter.detectProprietaryClusters(node);
        }
      }
      out.router = true;
    } catch (e) {
      try { device.log?.(`[LAYERS] ProtocolRouter skip: ${e.message}`); } catch { /* noop */ }
    }
  }

  // Time sync only when EF00 / Tuya cluster is present and no engine yet
  if (!device.timeSyncEngine && !device._globalTimeSync) {
    try {
      const ep = node?.endpoints?.[1] || node?.endpoints?.[2];
      const clusters = ep?.clusters || {};
      const hasEf00 = !!(
        clusters.tuya
        || clusters.manuSpecificTuya
        || clusters.tuyaSpecific
        || clusters[0xEF00]
        || clusters[61184]
        || device._protocolInfo?.hasTuyaCluster
      );
      const zclOnly = String(device._protocolInfo?.protocol || '').toLowerCase() === 'zcl_only';
      if (hasEf00 && !zclOnly) {
        const GlobalTimeSyncEngine = require('../tuya/GlobalTimeSyncEngine');
        device.timeSyncEngine = new GlobalTimeSyncEngine(device);
        if (typeof device.timeSyncEngine.syncTime === 'function') {
          await device.timeSyncEngine.syncTime(node).catch(() => {});
        }
        if (typeof device.timeSyncEngine.setupListener === 'function') {
          device.timeSyncEngine.setupListener(node);
        }
        if (typeof device.timeSyncEngine.schedulePeriodicSync === 'function') {
          device.timeSyncEngine.schedulePeriodicSync(node);
        }
        out.timeSync = true;
      }
    } catch (e) {
      try { device.log?.(`[LAYERS] TimeSync skip: ${e.message}`); } catch { /* noop */ }
    }
  }

  try {
    device.healthMonitor?.trackIncomingReport?.(device.getData?.()?.id);
  } catch { /* optional */ }

  // P207: cross-layer redundancy — unsupported cache, multi-source confirm, RX dedup
  try {
    const { attachCrossLayerRedundancy } = require('./CrossLayerRedundancy');
    const x = await attachCrossLayerRedundancy(device, node);
    out.crossLayer = !x?.skipped;
    out.smartCaps = x?.smartCaps || 0;
  } catch (e) {
    try { device.log?.(`[LAYERS] CrossLayer skip: ${e.message}`); } catch { /* noop */ }
  }

  // P208: inventaire + enchaînement RX/TX (DP / ZCL / bound / raw / MCU / IAS)
  try {
    const { attachProtocolRxTxChain } = require('./ProtocolRxTxChain');
    const rx = await attachProtocolRxTxChain(device, node);
    out.rxtx = !rx?.skipped;
    out.rxtxPaths = rx?.paths || 0;
  } catch (e) {
    try { device.log?.(`[LAYERS] ProtocolRxTx skip: ${e.message}`); } catch { /* noop */ }
  }

  // Dynamic adaptation: DPAdaptationEngine + DynamicCapabilityManager on dpReport stream.
  // Runs after EF00Manager is attached so the event emitter is ready.
  await _bootDynamicAdaptation(device).catch(e => {
    try { device.log?.(`[LAYERS] DynamicAdaptation skip: ${e.message}`); } catch { /* noop */ }
  });
  out.dynamicAdaptation = !!device._dynamicAdaptationBooted;

  return out;
}

module.exports = { bootstrapUniversalLayers };
