'use strict';

/**
 * ARCH / SSOT: Rank Zigbee/Tuya I/O paths for flexible device communications (P2270).
 * ORIGIN: Composes ProtocolRxTxChain.PROTOCOL_PATHS + IntelligentProtocolDetect + FallbackChains ideas (P208/P214/P92.122).
 * POURQUOI: Drivers and CI need a single scored view of “try DP vs ZCL vs IAS vs magic” without forking god bases.
 * COMMENT: Pure function table — no TX side effects. DeviceIO / ProtocolRxTxChain remain the executors.
 * POUR QUI: Homey runtime soft logs + CI harvest / coverage; BOTH tracks.
 * QUAND: Pair / onNodeInit planning / unsupported-op recovery planning — not every RX byte.
 * CONTRE QUOI: Forcing tuya_dp on sacred zcl_only (BSEED) or inventing paths outside PROTOCOL_PATHS.
 * TIP IA: Prefer rankPaths() then FallbackChains/DeviceIO; never invent productId.
 * TIP HUM: See docs/architecture/COMM_PATHFINDING.md
 */

const { PROTOCOL_PATHS } = (() => {
  try {
    return require('../layers/ProtocolRxTxChain');
  } catch (_e) {
    return { PROTOCOL_PATHS: {} };
  }
})();

/** @typedef {{ id: string, score: number, reasons: string[] }} RankedPath */

/**
 * @param {object} ctx
 * @param {string[]} [ctx.clustersPresent] hex/decimal/name cluster ids present on interview
 * @param {string} [ctx.protocolHint] ZCL|TUYA_DP|HYBRID|zcl_only
 * @param {boolean} [ctx.sleepy]
 * @param {boolean} [ctx.sacredZclOnly]
 * @param {string} [ctx.capability] Homey capability hint
 * @param {boolean} [ctx.needsMagic]
 * @returns {RankedPath[]}
 */
function rankPaths(ctx = {}) {
  const clusters = new Set(
    (ctx.clustersPresent || []).map((c) => {
      if (typeof c === 'number') {return c;}
      const s = String(c).toLowerCase();
      if (s.startsWith('0x')) {return parseInt(s, 16);}
      if (/^\d+$/.test(s)) {return Number(s);}
      if (s.includes('ef00') || s === 'tuya') {return 0xEF00;}
      if (s.includes('ias')) {return 0x0500;}
      return s;
    }),
  );
  const hasEf00 = clusters.has(0xEF00) || clusters.has(61184);
  const hasIas = clusters.has(0x0500) || clusters.has(1280);
  const hasE002 = clusters.has(0xE002) || clusters.has(57346);
  const hint = String(ctx.protocolHint || '').toLowerCase();
  const sacred = !!ctx.sacredZclOnly || hint === 'zcl_only';
  const sleepy = !!ctx.sleepy;
  const cap = String(ctx.capability || '').toLowerCase();

  const scores = [];
  for (const [id, meta] of Object.entries(PROTOCOL_PATHS || {})) {
    let score = 10;
    const reasons = [];

    if (sacred && id === 'tuya_dp') {
      score -= 100;
      reasons.push('sacred_zcl_only_blocks_ef00_tx');
    }
    if (sacred && (id === 'zcl' || id === 'cluster_bound')) {
      score += 40;
      reasons.push('sacred_prefers_zcl');
    }
    if (hasEf00 && id === 'tuya_dp' && !sacred) {
      score += 35;
      reasons.push('interview_has_ef00');
    }
    if (hasE002 && id === 'tuya_bound') {
      score += 25;
      reasons.push('interview_has_e002');
    }
    if (hasIas && id === 'ias') {
      score += 40;
      reasons.push('interview_has_ias');
    }
    if (sleepy && id === 'tuya_dp' && hasIas) {
      score -= 30;
      reasons.push('sleepy_ias_skip_leftover_ef00');
    }
    if (sleepy && (id === 'cluster_bound' || id === 'mcu')) {
      score -= 15;
      reasons.push('sleepy_avoid_boot_storm');
    }
    if (ctx.needsMagic && id === 'magic') {
      score += 30;
      reasons.push('needs_magic_handshake');
    }
    if (hint.includes('hybrid') && (id === 'tuya_dp' || id === 'zcl')) {
      score += 10;
      reasons.push('hybrid_listen');
    }
    if (cap.startsWith('alarm_') && id === 'ias') {
      score += 20;
      reasons.push('alarm_capability');
    }
    if ((cap === 'onoff' || cap === 'dim') && id === 'zcl' && sacred) {
      score += 15;
      reasons.push('switch_dim_zcl');
    }
    if (meta.sleepySafe === false && sleepy) {
      score -= 10;
      reasons.push('path_not_sleepy_safe');
    }
    if (typeof meta.cost === 'number') {
      score -= meta.cost;
    }

    scores.push({ id, score, reasons, label: meta.label });
  }

  return scores.sort((a, b) => b.score - a.score);
}

function bestPath(ctx) {
  const ranked = rankPaths(ctx);
  return ranked[0] || null;
}

module.exports = {
  rankPaths,
  bestPath,
  PROTOCOL_PATHS,
};
