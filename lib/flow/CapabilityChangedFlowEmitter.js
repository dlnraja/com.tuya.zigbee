'use strict';

/**
 * P2747 — Emit declared Homey Flow cards that carry TAGS (tokens) when a
 * capability value actually changes.
 *
 * WHY: Homey mobile shows a tag icon on triggers with `tokens[]`. Bastien
 * declared ~1000 `*_changed` cards but most were never fired → "every tagged
 * Flow is dead". Contre quoi: compose tags without emit.
 *
 * Dual-app: BOTH (flow reliability). Soft / fire-and-forget / throttled.
 */

const { buildCapabilityFlowCandidates, collectDeclaredFlowIds, findDeclaredCI } = require('./FlowCardHeuristics');
const { safeGetFlowCard, isNoopFlowCard } = require('../io/HomeyCompensationLayer');

/** capability → preferred token names (union; first that matches card wins for primary) */
const CAP_TOKEN_ALIASES = {
  measure_temperature: ['temperature', 'value', 'temp'],
  measure_humidity: ['humidity', 'value'],
  measure_luminance: ['lux', 'illuminance', 'luminance', 'value'],
  'measure_luminance.distance': ['distance', 'value'],
  measure_battery: ['battery', 'value'],
  measure_power: ['power', 'value'],
  measure_voltage: ['voltage', 'value'],
  measure_current: ['current', 'value'],
  meter_power: ['energy', 'meter_power', 'value'],
  measure_co2: ['co2', 'level', 'value'],
  measure_co: ['ppm', 'co', 'value'],
  measure_pm25: ['pm25', 'value'],
  measure_water: ['moisture', 'level', 'depth', 'percentage', 'value'],
  dim: ['dim', 'brightness', 'value'],
  windowcoverings_set: ['position', 'value'],
  target_temperature: ['temperature', 'setpoint', 'value'],
};

const THROTTLE_MS = 400;

function numOrPassthrough(value) {
  if (typeof value === 'boolean') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function buildTokensForCard(cardDef, capability, value) {
  const tokens = {};
  const aliases = CAP_TOKEN_ALIASES[capability] || ['value'];
  const declared = Array.isArray(cardDef?.tokens) ? cardDef.tokens : [];
  if (declared.length) {
    for (const t of declared) {
      const name = t && t.name;
      if (!name) continue;
      if (name === 'value' || aliases.includes(name) || name === capability.replace(/^measure_/, '')) {
        tokens[name] = numOrPassthrough(value);
      } else if (t.type === 'number' || t.type === 'string' || t.type === 'boolean') {
        // Single-token cards: fill the only token
        if (declared.length === 1) tokens[name] = numOrPassthrough(value);
      }
    }
    // If still empty but card has tokens, fill first token
    if (!Object.keys(tokens).length && declared[0]?.name) {
      tokens[declared[0].name] = numOrPassthrough(value);
    }
  } else {
    tokens[aliases[0]] = numOrPassthrough(value);
    tokens.value = numOrPassthrough(value);
  }
  return tokens;
}

function listDeclaredTriggerDefs(device) {
  const out = [];
  try {
    const list = device?.driver?.manifest?.flow?.triggers;
    if (Array.isArray(list)) {
      for (const t of list) {
        if (t?.id) out.push(t);
      }
    }
  } catch (_e) { /* soft */ }
  return out;
}

/**
 * @param {object} device Homey ZigBee device
 * @param {string} capability
 * @param {*} value
 * @param {*} previousValue
 * @returns {Promise<number>} number of cards triggered
 */
async function emitCapabilityChangedFlows(device, capability, value, previousValue) {
  if (!device?.homey?.flow || device._destroyed) return 0;
  if (!capability || typeof capability !== 'string') return 0;
  if (previousValue !== undefined && previousValue !== null && previousValue === value) return 0;

  // Skip UI pulse / button caps — handled by button path
  if (/^button(\.|$)/i.test(capability)) return 0;

  const driverId = String(device.driver?.id || '');
  if (!driverId) return 0;

  const now = Date.now();
  const throttleKey = `${capability}`;
  if (!device.__p2747CapFlowTs) device.__p2747CapFlowTs = Object.create(null);
  if (device.__p2747CapFlowTs[throttleKey]
    && now - device.__p2747CapFlowTs[throttleKey] < THROTTLE_MS) {
    return 0;
  }
  device.__p2747CapFlowTs[throttleKey] = now;

  const declaredIds = collectDeclaredFlowIds(device.homey, device);
  const candidates = buildCapabilityFlowCandidates(driverId, capability);
  // Also try short `*_temperature_changed` style from measure_temperature
  if (capability.startsWith('measure_')) {
    const short = capability.replace(/^measure_/, '');
    candidates.push(`${driverId}_${short}_changed`);
  }
  if (capability === 'measure_luminance') {
    candidates.push(`${driverId}_illuminance_changed`);
    candidates.push(`${driverId}_lux_changed`);
  }
  if (capability === 'measure_luminance.distance') {
    candidates.push(`${driverId}_distance_changed`);
  }

  const defs = listDeclaredTriggerDefs(device);
  const defById = new Map(defs.map((t) => [String(t.id), t]));

  // Prefer declared IDs that look like this capability's changed card
  const ordered = [];
  const seen = new Set();
  const pushId = (id) => {
    if (!id) return;
    const hit = findDeclaredCI(declaredIds, id) || (defById.has(id) ? id : null);
    if (!hit) return;
    const k = String(hit).toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    ordered.push(hit);
  };

  for (const id of candidates) pushId(id);
  // Scan defs for token cards matching capability keyword
  const capKey = capability.replace(/^measure_/, '').replace(/^meter_/, '').replace(/\./g, '_');
  for (const t of defs) {
    const id = String(t.id || '');
    if (!/changed$/i.test(id)) continue;
    if (!t.tokens || !t.tokens.length) continue;
    if (new RegExp(capKey, 'i').test(id) || new RegExp(capability.replace(/\./g, '[_\\.]'), 'i').test(id)) {
      pushId(id);
    }
  }

  if (!ordered.length) return 0;

  let fired = 0;
  for (const id of ordered.slice(0, 3)) {
    const cardDef = defById.get(id) || { id, tokens: [{ name: (CAP_TOKEN_ALIASES[capability] || ['value'])[0] }] };
    const tokens = buildTokensForCard(cardDef, capability, value);
    try {
      const card = safeGetFlowCard(device.homey, id, 'trigger', declaredIds.size ? declaredIds : null);
      if (!card || isNoopFlowCard(card) || typeof card.trigger !== 'function') continue;
      // eslint-disable-next-line no-await-in-loop
      await card.trigger(device, tokens, { capability, value });
      fired += 1;
    } catch (_e) { /* soft */ }
  }
  return fired;
}

module.exports = {
  emitCapabilityChangedFlows,
  buildTokensForCard,
  CAP_TOKEN_ALIASES,
};
