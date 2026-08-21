'use strict';

/**
 * IntelligentProtocolDetect — single source of truth for ZCL ↔ Tuya EF00 (0xEF00).
 *
 * Detection order (never invent; sacred couple + cluster truth win):
 *  1. Sacred / profile override (`zcl_only` manufacturer config or known BSEED list)
 *  2. Cluster truth: EF00 + useful ZCL → HYBRID (listen both, TX via cascade)
 *  3. EF00 only → TUYA_DP
 *  4. ZCL only → ZCL
 *  5. Heuristics (TS0601 escape hatch when no EF00 but ZCL present; _TZE* prefer DP)
 *  6. Ambiguous → HYBRID listen (optimizer learns within ~15 min)
 *
 * All Unified* bases and UniversalLayerBootstrap should call this — do not fork
 * per-driver TS0601 / _TZE heuristics.
 */

const ZCL_ONLY_MANUFACTURERS = new Set([
  // .cursorrules BSEED ZCL-only fingerprints + forum locks
  '_tz3000_l9brjwau',
  '_tz3000_blhvsaqf',
  '_tz3000_ysdv91bk',
  '_tz3000_hafsqare',
  '_tz3000_e98krvvk',
  '_tz3000_iedbgyxt',
  '_tz3000_cauq1okq',
  '_tz3000_w5xztuy7',
  '_tz3000_mrduubod',
  '_tz3000_qkixdnon',
  '_tz3000_v4l4b0lp',
  '_tz3000_zivfvd7h',
  '_tz3000_cfz9h9re',
]);

const EF00_KEYS = new Set([
  'tuya', 'manuspecifictuya', 'tuyaspecific', 'tuyamanufacturer',
  'ef00', '0xef00', '61184',
]);

const ZCL_USEFUL = new Set([
  'onoff', 'levelcontrol', 'colorcontrol', 'windowcovering',
  'thermostat', 'temperaturemeasurement', 'relativehumiditymeasurement',
  'illuminancemeasurement', 'occupancysensing', 'iaszone', 'iaswd',
  'powerconfiguration', 'electricalmeasurement', 'metering',
  'genonoff', 'genlevelctrl', 'closureswindowcovering',
  '6', '8', '768', '258', '513', '1026', '1029', '1024', '1030',
  '1280', '1', '2820', '1794',
]);

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function isSacredZclOnlyManufacturer(mfr) {
  const n = norm(mfr);
  if (!n) return false;
  if (ZCL_ONLY_MANUFACTURERS.has(n)) return true;
  return false;
}

function resolveIdentity(device) {
  let modelId = '';
  let mfr = '';
  try {
    const { getModelId, getManufacturer } = require('../helpers/DeviceDataHelper');
    modelId = getModelId(device) || '';
    mfr = getManufacturer(device) || '';
  } catch (_) { /* optional */ }

  const settings = device?.getSettings?.() || {};
  const store = typeof device?.getStore === 'function' ? (device.getStore() || {}) : {};
  const data = device?.getData?.() || {};
  const node = device?.zclNode;

  modelId = modelId
    || settings.zb_model_id || settings.zb_modelId
    || store.modelId || store.productId
    || data.modelId || data.productId
    || node?.modelId || '';
  mfr = mfr
    || settings.zb_manufacturer_name || settings.zb_manufacturerName
    || store.manufacturerName || data.manufacturerName
    || node?.manufacturerName || '';

  return { modelId: String(modelId), mfr: String(mfr) };
}

function scanClusters(zclNode) {
  let hasTuyaCluster = false;
  let hasZclClusters = false;
  const eps = zclNode?.endpoints || {};
  for (const ep of Object.values(eps)) {
    const clusters = ep?.clusters || {};
    for (const key of Object.keys(clusters)) {
      const k = norm(key);
      const asInt = parseInt(key, 10);
      if (
        EF00_KEYS.has(k)
        || asInt === 0xEF00
        || asInt === 61184
      ) {
        hasTuyaCluster = true;
        continue;
      }
      if (ZCL_USEFUL.has(k) || ZCL_USEFUL.has(String(asInt))) {
        hasZclClusters = true;
      }
    }
  }
  return { hasTuyaCluster, hasZclClusters };
}

/**
 * @param {object} device Homey ZigBee device instance
 * @param {object} [zclNode] optional node override
 * @returns {object} protocol info (legacy-compatible + hybrid flags)
 */
function isStandardZclSwitchModel(modelId) {
  const u = String(modelId || '').toUpperCase();
  return /^TS000[1-4]$/.test(u) || /^TS000F$/.test(u) || /^TS001[1-4]$/.test(u);
}

function isZclSwitchManufacturerFamily(mfr) {
  const n = norm(mfr);
  return n.startsWith('_tz3000_')
    || n.startsWith('_tz3210_')
    || n.startsWith('_tyzb01_');
}

function detectIntelligentProtocol(device, zclNode) {
  const { modelId, mfr } = resolveIdentity(device);
  const node = zclNode || device?.zclNode;
  const { hasTuyaCluster, hasZclClusters } = scanClusters(node);

  const modelUp = modelId.toUpperCase();
  const mfrUp = mfr.toUpperCase();
  const isTS060x = /^TS060[0-9]$/.test(modelUp) || modelUp.startsWith('TS0601');
  const isTS130F = modelUp === 'TS130F' || modelUp.startsWith('TS130');
  const isTzeFamily = mfrUp.startsWith('_TZE');
  const profileProto = norm(
    device?._manufacturerConfig?.protocol
    || device?._protocolInfo?.forcedProtocol
    || ''
  );

  const base = {
    modelId,
    mfr,
    hasTuyaCluster,
    hasZclClusters,
    listenHybrid: false,
    preferDpTx: false,
    isStandardZCL: false,
    isSONOFF: false,
  };

  // ── 1. Sacred / profile zcl_only ───────────────────────────────────────
  if (
    profileProto === 'zcl_only'
    || isSacredZclOnlyManufacturer(mfr)
  ) {
    return {
      ...base,
      protocol: 'zcl_only',
      isTuyaDP: false,
      isPureTuyaDP: false,
      listenHybrid: false,
      preferDpTx: false,
      isStandardZCL: true,
      reason: 'sacred_zcl_only',
    };
  }

  // WHY: TS000x/_TZ3000 wall switches often interview a dead 0xEF00.
  // Listening to that leftover DP stream remaps gang 1 onto gang 2 after
  // a fresh pair (Johan-style ZCL endpoints never had this bleed).
  if (isStandardZclSwitchModel(modelId) && isZclSwitchManufacturerFamily(mfr) && hasZclClusters) {
    return {
      ...base,
      protocol: 'zcl_only',
      isTuyaDP: false,
      isPureTuyaDP: false,
      listenHybrid: false,
      preferDpTx: false,
      isStandardZCL: true,
      reason: 'ts000x_zcl_switch_ignore_leftover_ef00',
    };
  }

  // WHY: TS0207/TS0203/TS0215 IAS + TS004x sleepy remotes. Leftover 0xEF00
  // interview must not become HYBRID queryAllDPs (1cf775a2). Keep IAS/raw RX.
  // Do not ignore when 61184 is a real MCU (TS0601 / _TZE).
  const uModel = String(modelId || '').toUpperCase();
  const isIasSleepyPid = uModel === 'TS0207' || uModel === 'TS0203' || uModel.indexOf('TS0215') === 0;
  const isTs004xSleepy = /^TS004[0-9A-F]$/.test(uModel);
  if ((isIasSleepyPid || isTs004xSleepy) && !isTzeFamily && !isTS060x) {
    return {
      ...base,
      protocol: 'ZCL',
      isTuyaDP: false,
      isPureTuyaDP: false,
      listenHybrid: false,
      preferDpTx: false,
      isStandardZCL: true,
      reason: isIasSleepyPid ? 'ts02xx_ias_ignore_leftover_ef00' : 'ts004x_sleepy_ignore_leftover_ef00',
    };
  }

  // ── TS130F covers are ZCL windowCovering ───────────────────────────────
  if (isTS130F) {
    return {
      ...base,
      protocol: 'ZCL',
      isTuyaDP: false,
      isPureTuyaDP: false,
      isStandardZCL: true,
      reason: 'ts130f_zcl_cover',
    };
  }

  // ── 2–4. Cluster truth ─────────────────────────────────────────────────
  if (hasTuyaCluster && hasZclClusters) {
    return {
      ...base,
      protocol: 'HYBRID',
      isTuyaDP: false,
      isPureTuyaDP: false,
      listenHybrid: true,
      preferDpTx: isTzeFamily || isTS060x,
      reason: 'ef00_and_zcl_present',
    };
  }

  if (hasTuyaCluster && !hasZclClusters) {
    return {
      ...base,
      protocol: 'TUYA_DP',
      isTuyaDP: true,
      isPureTuyaDP: true,
      listenHybrid: false,
      preferDpTx: true,
      reason: 'ef00_only',
    };
  }

  if (!hasTuyaCluster && hasZclClusters) {
    // TS0601 escape hatch: model says MCU but interview shows ZCL-only (PIR etc.)
    if (isTS060x) {
      return {
        ...base,
        protocol: 'ZCL',
        isTuyaDP: false,
        isPureTuyaDP: false,
        isStandardZCL: true,
        reason: 'ts0601_zcl_only_no_ef00',
      };
    }
    return {
      ...base,
      protocol: 'ZCL',
      isTuyaDP: false,
      isPureTuyaDP: false,
      isStandardZCL: true,
      reason: 'zcl_only_clusters',
    };
  }

  // ── 5. Heuristics when interview incomplete ────────────────────────────
  if (isTS060x || isTzeFamily) {
    // No clusters yet — listen hybrid until optimizer / first hit
    return {
      ...base,
      protocol: 'HYBRID',
      isTuyaDP: true,
      isPureTuyaDP: false,
      listenHybrid: true,
      preferDpTx: true,
      reason: isTS060x ? 'ts060x_ambiguous_hybrid' : 'tze_ambiguous_hybrid',
    };
  }

  // SONOFF / TS02* typical ZCL
  const isSONOFF = /^(sonoff|ewelink)$/i.test(mfr) || /^SNZB/i.test(modelId);
  if (isSONOFF || /^TS02/i.test(modelId)) {
    return {
      ...base,
      protocol: 'ZCL',
      isTuyaDP: false,
      isPureTuyaDP: false,
      isStandardZCL: true,
      isSONOFF,
      reason: 'standard_zcl_heuristic',
    };
  }

  // ── 6. Default: hybrid listen (dynamic adaptation) ─────────────────────
  return {
    ...base,
    protocol: 'HYBRID',
    isTuyaDP: false,
    isPureTuyaDP: false,
    listenHybrid: true,
    preferDpTx: false,
    reason: 'default_hybrid_listen',
  };
}

/**
 * Apply detection onto the device instance (idempotent fields).
 */
function applyIntelligentProtocol(device, zclNode) {
  const info = detectIntelligentProtocol(device, zclNode);
  if (!device) return info;
  device._protocolInfo = info;
  device._isPureTuyaDP = !!info.isPureTuyaDP;
  device._listenHybrid = !!info.listenHybrid;
  device._preferDpTx = !!info.preferDpTx;
  if (info.protocol === 'zcl_only' && device._manufacturerConfig) {
    device._manufacturerConfig.protocol = 'zcl_only';
  } else if (info.protocol === 'zcl_only') {
    device._manufacturerConfig = {
      ...(device._manufacturerConfig || {}),
      protocol: 'zcl_only',
    };
  }
  return info;
}

module.exports = {
  detectIntelligentProtocol,
  applyIntelligentProtocol,
  isSacredZclOnlyManufacturer,
  ZCL_ONLY_MANUFACTURERS,
  scanClusters,
  isStandardZclSwitchModel,
  isZclSwitchManufacturerFamily,
};
