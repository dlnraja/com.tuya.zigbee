'use strict';

/**
 * P2834 — Moes / Zemismart complementary action merge (UNION, never degrade).
 *
 * WHY (P215):
 * - Pourquoi: Moes + Zemismart OEMs mix ZCL, EF00 DP, raw frames and late DP learn;
 *   a single brand gate arms RX/TX path union without inventing pid.
 * - Comment: detect brand → enrich protocolInfo (parallelDiscover) → CCR write opts
 *   (ZCL named → ZCL raw → Tuya DP → raw EF00 → soft DP detect) via CommunicationPathFinder.
 * - Pour qui: Homey users with Moes ZTS / Star / TS004x and Zemismart covers / TB25 / remotes.
 * - Quand: onNodeInit protocol apply + capability TX + path ranking.
 * - Contre quoi: wiping sacred zcl_only (BSEED / TB25 ZCL); leftover EF00 on multi-gang ZCL;
 *   inventing manufacturerName/productId.
 *
 * Dual-app: BOTH (reliability TX/RX). Silent enrich — no forum POST.
 */

/** Known Moes OEM suffixes (verified couples / forum / Z2M — mfr suffix only). */
const MOES_SUFFIX_RE = new RegExp(
  [
    '5slehgeo', 'nhyj64w2', '127x7wnl', 'upt8lzi0', 'i8sdouy0', 'kq1l5eu5',
    'zgyzgdua', 'abrsvsou', 'mh9px7cq', 'uri7ez8u', 'rrjr1q0u', 'vp6clf9d',
    'zenj4lxv', '2ekuz3dz', 'ptjcjise', 'mrduubod', 'lawxy9e2', 'gubdgai2',
    'qd7b1tng', 'yf85qnvi', 'b2so2sw6', '8awzzqqg',
  ].join('|'),
  'i',
);

/** Known Zemismart OEM suffixes (covers + remotes + TB25 ZCL — couple still locked elsewhere). */
const ZEMISMART_SUFFIX_RE = new RegExp(
  [
    '3mzb0sdz', 'a37eix1s', 'empogkya', '18ejxrzk', 'jjdkhueq', 'ywubfuvt',
    'kgxej1dv', 'eqsair32', 'shkxsgis', 'r731zlxk', 'm6lwazh9', 'zah67ekd',
    '9p5xmj5r', 'nw1r9hp6',
    // P2835 — official Homey com.zemismart.iot + zemismart-zha-quirks
    'lnyz4a6v', '1tnysxwl', 'dmckrsxg', 'a2teqi5u', '3ctwoaip', 'e4pf6l87',
    'xvywzhmi', 'y4jqpry8', 'xibaabmu', 'o409r73p', 'oy1nuaa5', '5aico93l',
    'pyh4zt7w', 'k9e7ihec', 'ft7qqpx3', '6hrnp30w', 'cirjrpxe', 'vuwtqx0t',
    'ephrk8to', 'ahyyfhqk', 'zuphzsmo', '6si1pnia', 'rzdkn5rx', 'fzo2pocs',
    'zm8zpwas', 'xwuveizv', 'qazgdsae', 'jt50ea5d',
  ].join('|'),
  'i',
);

/** Ordered complementary TX/RX action lanes (names align with PROTOCOL_PATHS / CCR). */
const ACTION_PATH_ORDER = Object.freeze([
  'zcl',
  'zcl_raw',
  'tuya_dp',
  'raw_frame',
  'dp_detect',
]);

function _norm(s) {
  return String(s || '').trim().toLowerCase();
}

function _mfrFromDevice(device) {
  if (!device) {return '';}
  try {
    const settings = typeof device.getSettings === 'function' ? device.getSettings() || {} : {};
    const store = typeof device.getStoreValue === 'function'
      ? {
        mfr: device.getStoreValue('manufacturerName'),
      }
      : {};
    const data = typeof device.getData === 'function' ? device.getData() || {} : {};
    return _norm(
      settings.zb_manufacturer_name
      || settings.zb_manufacturerName
      || store.mfr
      || data.manufacturerName
      || device.zclNode?.manufacturerName
      || device._protocolInfo?.mfr
      || '',
    );
  } catch (_) {
    return _norm(device._protocolInfo?.mfr || '');
  }
}

function _pidFromDevice(device) {
  if (!device) {return '';}
  try {
    const settings = typeof device.getSettings === 'function' ? device.getSettings() || {} : {};
    const data = typeof device.getData === 'function' ? device.getData() || {} : {};
    return _norm(
      settings.zb_model_id
      || settings.zb_modelId
      || device.getStoreValue?.('modelId')
      || data.modelId
      || data.productId
      || device.zclNode?.modelId
      || device._protocolInfo?.modelId
      || '',
    );
  } catch (_) {
    return _norm(device._protocolInfo?.modelId || '');
  }
}

/**
 * @param {string} mfr
 * @param {{ brandHint?: string, productId?: string }} [opts]
 * @returns {'moes'|'zemismart'|null}
 */
function detectBrand(mfr, opts = {}) {
  const hint = _norm(opts.brandHint || '');
  if (hint === 'moes' || hint.includes('moes')) {return 'moes';}
  if (hint === 'zemismart' || hint.includes('zemismart') || hint.includes('lonsonho')) {
    return 'zemismart';
  }
  const n = _norm(mfr);
  if (!n) {return null;}
  if (n.includes('moes')) {return 'moes';}
  if (n.includes('zemismart') || n.includes('lonsonho')) {return 'zemismart';}
  if (MOES_SUFFIX_RE.test(n)) {return 'moes';}
  if (ZEMISMART_SUFFIX_RE.test(n)) {return 'zemismart';}
  return null;
}

/**
 * Sacred / ZCL-only must NOT get Tuya DP race (TB25, BSEED, leftover EF00).
 * @param {object} [protocolInfo]
 * @param {object} [device]
 */
function isSacredZclOnly(protocolInfo, device) {
  const proto = _norm(protocolInfo?.protocol || device?._manufacturerConfig?.protocol || '');
  if (proto === 'zcl_only') {return true;}
  try {
    const { isSacredZclOnlyManufacturer } = require('./IntelligentProtocolDetect');
    const mfr = protocolInfo?.mfr || _mfrFromDevice(device);
    if (isSacredZclOnlyManufacturer(mfr)) {return true;}
  } catch (_) { /* optional */ }
  return false;
}

/**
 * @param {object} [device]
 * @param {object} [protocolInfo]
 * @returns {boolean}
 */
function shouldMergeActions(device, protocolInfo) {
  const info = protocolInfo || device?._protocolInfo || {};
  if (isSacredZclOnly(info, device)) {return false;}
  const brandCfg = _norm(device?._manufacturerConfig?.brand || '');
  const brand = detectBrand(info.mfr || _mfrFromDevice(device), {
    brandHint: brandCfg || info.brand,
    productId: info.modelId || _pidFromDevice(device),
  });
  if (!brand) {return false;}
  // TS000x ZCL wall family already forced zcl_only in IntelligentProtocolDetect —
  // if somehow still hybrid with leftover EF00, do not race DP on multi-gang.
  const pid = _norm(info.modelId || _pidFromDevice(device));
  if (/^ts000[1-4]$/i.test(pid) && Number(device?.gangCount) > 1 && device?._isPureTuyaDP !== true) {
    return false;
  }
  return true;
}

/**
 * Ordered action lanes for Moes/Zemismart (complementary union).
 * @returns {string[]}
 */
function buildActionPathPlan(ctx = {}) {
  const sacred = !!ctx.sacredZclOnly;
  if (sacred) {
    return ['zcl', 'zcl_raw'];
  }
  const plan = [...ACTION_PATH_ORDER];
  // Pure MCU covers / TS0601: prefer DP earlier but keep ZCL as complementary listen/TX.
  if (ctx.preferDpTx) {
    const dpIdx = plan.indexOf('tuya_dp');
    const zclIdx = plan.indexOf('zcl');
    if (dpIdx > 0 && zclIdx === 0) {
      plan.splice(dpIdx, 1);
      plan.splice(1, 0, 'tuya_dp');
    }
  }
  return plan;
}

/**
 * Enrich detect result in-place (never upgrades zcl_only → DP).
 * @param {object} info
 * @param {object} [device]
 * @returns {object} info
 */
function enrichProtocolInfo(info, device) {
  if (!info || typeof info !== 'object') {return info;}
  if (isSacredZclOnly(info, device)) {
    info.brandActionMerge = { brand: null, enabled: false, reason: 'sacred_zcl_only' };
    return info;
  }
  const brandCfg = _norm(device?._manufacturerConfig?.brand || '');
  const brand = detectBrand(info.mfr, {
    brandHint: brandCfg || info.brand,
    productId: info.modelId,
  });
  if (!brand) {
    info.brandActionMerge = { brand: null, enabled: false, reason: 'not_moes_zemismart' };
    return info;
  }
  if (!shouldMergeActions(device, info)) {
    info.brandActionMerge = { brand, enabled: false, reason: 'guard_skip' };
    return info;
  }
  // Complementary arm — never clear existing flags, only OR-in.
  info.parallelDiscover = true;
  info.listenHybrid = true;
  if (info.protocol !== 'zcl_only') {
    if (!info.protocol || info.protocol === 'ZCL') {
      info.protocol = info.hasTuyaCluster || /^_tze/i.test(String(info.mfr || '')) || /^ts0601$/i.test(String(info.modelId || ''))
        ? 'HYBRID'
        : info.protocol || 'HYBRID';
    }
  }
  info.brandActionMerge = {
    brand,
    enabled: true,
    paths: buildActionPathPlan({
      preferDpTx: !!info.preferDpTx,
      sacredZclOnly: false,
    }),
    reason: `p2834_${brand}_action_merge`,
  };
  info.reason = `${info.reason || 'detect'}+${info.brandActionMerge.reason}`;
  return info;
}

/**
 * Apply brand flags onto device after IntelligentProtocolDetect.
 * @param {object} device
 * @param {object} [info]
 */
function applyBrandActionMerge(device, info) {
  if (!device) {return info || null;}
  const enriched = enrichProtocolInfo(info || device._protocolInfo || {}, device);
  if (!enriched) {return enriched;}
  device._protocolInfo = enriched;
  const merge = enriched.brandActionMerge;
  if (merge?.enabled) {
    device._parallelDiscover = true;
    device._listenHybrid = true;
    device._brandActionMerge = merge;
    // Soft DP detect flag — EF00 manager / incomplete-arm may query; never invent maps.
    try {
      const prev = device.getStoreValue?.('p2834_dp_detect') || {};
      device.setStoreValue?.('p2834_dp_detect', {
        ...prev,
        brand: merge.brand,
        enabled: true,
        armedAt: prev.armedAt || Date.now(),
      }).catch?.(() => {});
    } catch (_) { /* store optional */ }
  }
  return enriched;
}

/**
 * Merge CCR write opts for Moes/Zemismart (parallelDiscover + raw EF00 step).
 * @param {object} device
 * @param {object} [baseOpts]
 * @returns {object}
 */
function buildWriteOpts(device, baseOpts = {}) {
  const opts = { ...baseOpts || {} };
  if (!shouldMergeActions(device, device?._protocolInfo)) {return opts;}
  const gang = Number(opts.endpoint || device?._capabilityEndpointHint || 1);
  // Multi-gang ZCL: never race leftover EF00 (same Contre quoi as CCR).
  if (gang > 1 && device?._isPureTuyaDP !== true && opts.forceDp !== true) {
    opts.parallelDiscover = opts.parallelDiscover === true;
    return opts;
  }
  opts.parallelDiscover = true;
  const extra = Array.isArray(opts.extraSteps) ? [...opts.extraSteps] : [];
  if (!extra.some((s) => s && s.name === 'raw-ef00-frame')) {
    extra.push({
      name: 'raw-ef00-frame',
      run: async () => {
        const cap = opts._capability || 'onoff';
        const value = opts._value;
        const dp = opts.dpId != null ? opts.dpId : 1;
        const type = opts.dpType || 'bool';
        if (typeof device._sendTuyaDP === 'function') {
          const ok = await device._sendTuyaDP(dp, type, value);
          if (ok === false) {throw new Error('raw-ef00-failed');}
          return 'raw-ef00-frame';
        }
        if (device.tuyaEF00Manager && typeof device.tuyaEF00Manager.sendDP === 'function') {
          await device.tuyaEF00Manager.sendDP(dp, value, type);
          return 'raw-ef00-frame';
        }
        if (typeof device.writeData32 === 'function' && type === 'value') {
          const ok = await device.writeData32(dp, value);
          if (ok === false) {throw new Error('raw-ef00-failed');}
          return 'raw-ef00-frame';
        }
        if (typeof device.writeBool === 'function' && type === 'bool') {
          const ok = await device.writeBool(dp, Boolean(value));
          if (ok === false) {throw new Error('raw-ef00-failed');}
          return 'raw-ef00-frame';
        }
        throw new Error('no-raw-ef00-sender');
      },
    });
  }
  // dp_detect stays in ACTION_PATH_ORDER / RX arm (applyBrandActionMerge) — not per-TX spam.
  opts.extraSteps = extra;
  return opts;
}

/**
 * Score boost for CommunicationPathFinder (additive, never sacred wipe).
 * @param {object} ctx
 * @param {string} pathId
 * @returns {{ score: number, reasons: string[] }}
 */
function rankPathBoost(ctx = {}, pathId) {
  const brand = detectBrand(ctx.mfr || ctx.manufacturerName, {
    brandHint: ctx.brandHint,
    productId: ctx.productId || ctx.modelId,
  });
  if (!brand || ctx.sacredZclOnly) {return { score: 0, reasons: [] };}
  const id = String(pathId || '');
  let score = 0;
  const reasons = [];
  if (id === 'tuya_dp' || id === 'zcl' || id === 'raw' || id === 'cluster_bound' || id === 'magic') {
    score += 8;
    reasons.push(`p2834_${brand}_path_union`);
  }
  if ((id === 'tuya_dp' || id === 'tuya_bound') && ctx.preferDpTx) {
    score += 6;
    reasons.push(`p2834_${brand}_prefer_dp`);
  }
  return { score, reasons };
}

module.exports = {
  MOES_SUFFIX_RE,
  ZEMISMART_SUFFIX_RE,
  ACTION_PATH_ORDER,
  detectBrand,
  shouldMergeActions,
  isSacredZclOnly,
  buildActionPathPlan,
  enrichProtocolInfo,
  applyBrandActionMerge,
  buildWriteOpts,
  rankPathBoost,
};
