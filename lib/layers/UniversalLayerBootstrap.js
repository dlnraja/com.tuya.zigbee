'use strict';

/**
 * UniversalLayerBootstrap — soft-attach proprietary protocol layers
 * that Unified* bases already wire, but bare TuyaZigbeeDevice lineages
 * (lights, IR, DIY, TuyaSpecificCluster) often miss.
 *
 * Never throws. Idempotent. MASTER_ONLY enrichment (P206).
 *
 * Layers touched:
 *  - ProtocolAutoOptimizer (DP vs ZCL learning)
 *  - IntelligentProtocolRouter (proprietary overlay detect)
 *  - GlobalTimeSyncEngine (EF00 / MCU time, only if cluster present)
 *  - CrossLayerRedundancy (unsupported cache + multi-source confirm + RX dedup)
 *  - ProtocolRxTxChain (inventory + cascade DP/ZCL/bound/raw/MCU/IAS)
 */

async function bootstrapUniversalLayers(device, zclNode) {
  if (!device || device._destroyed || device._universalLayersBootstrapped) {
    return { skipped: true };
  }
  device._universalLayersBootstrapped = true;
  const node = zclNode || device.zclNode;
  const out = { optimizer: false, router: false, timeSync: false };

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
      );
      if (hasEf00) {
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

  return out;
}

module.exports = { bootstrapUniversalLayers };
