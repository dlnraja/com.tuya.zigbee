'use strict';

/**
 * P2747 / P2748 — Emit declared Homey Flow cards that carry TAGS (tokens)
 * when a capability value actually changes — from ANY paint path
 * (safeSet, confirmInbound, raw setCapabilityValue, complementary RX/TX).
 *
 * WHY: Homey mobile shows a tag icon on triggers with `tokens[]`. Bastien
 * declared ~1000 `*_changed` cards but most were never fired → "every tagged
 * Flow is dead". Contre quoi: compose tags without emit; raw/complementary
 * paint that skips L14 without firing tags.
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
  onoff: ['state', 'onoff', 'value'],
  alarm_motion: ['motion', 'state', 'value'],
  alarm_contact: ['contact', 'state', 'value'],
  alarm_water: ['leak', 'water', 'state', 'value'],
  alarm_smoke: ['smoke', 'state', 'value'],
  alarm_tamper: ['tamper', 'state', 'value'],
  alarm_battery: ['battery_low', 'state', 'value'],
  alarm_generic: ['alarm', 'state', 'value'],
  alarm_presence: ['presence', 'state', 'value'],
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
      if (name === 'value' || aliases.includes(name) || name === capability.replace(/^measure_/, '').replace(/^alarm_/, '')) {
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
 * Extra candidates for alarm / onoff event-style tagged cards (not only *_changed).
 * @param {string} driverId
 * @param {string} capability
 * @param {*} value
 * @returns {string[]}
 */
function buildEventStyleCandidates(driverId, capability, value) {
  const out = [];
  if (!driverId || !capability) return out;
  if (capability === 'alarm_motion' && value === true) {
    out.push(`${driverId}_alarm_motion_true`, `${driverId}_motion_detected`, `${driverId}_motion_true`);
  }
  if (capability === 'alarm_contact') {
    out.push(value ? `${driverId}_contact_opened` : `${driverId}_contact_closed`);
    out.push(`${driverId}_alarm_contact_changed`);
  }
  if (capability === 'alarm_smoke' && value === true) {
    out.push(`${driverId}_smoke_detected`, `${driverId}_alarm_smoke_true`);
  }
  if (capability === 'alarm_water' && value === true) {
    out.push(`${driverId}_water_leak_detected`, `${driverId}_leak_detected`);
  }
  if (capability === 'onoff' || /^onoff\./i.test(capability)) {
    out.push(`${driverId}_onoff_changed`, `${driverId}_turned_${value ? 'on' : 'off'}`);
  }
  if (capability.startsWith('alarm_')) {
    out.push(`${driverId}_${capability}_changed`);
    out.push(`${driverId}_${capability.replace(/^alarm_/, '')}_changed`);
  }
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
  // Mark so complementary setCapabilityValue wrap does not double-fire
  device.__p2748EmitActive = true;

  try {
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
    for (const id of buildEventStyleCandidates(driverId, capability, value)) {
      candidates.push(id);
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
    // Scan defs for token cards matching capability keyword (Homey tag = tokens[])
    const capKey = capability.replace(/^measure_/, '').replace(/^meter_/, '').replace(/^alarm_/, '').replace(/\./g, '_');
    for (const t of defs) {
      const id = String(t.id || '');
      if (!t.tokens || !t.tokens.length) continue;
      const looksChanged = /changed$/i.test(id);
      const looksEvent = /_(opened|closed|detected|true|false|turned_on|turned_off)$/i.test(id);
      if (!looksChanged && !looksEvent) continue;
      if (new RegExp(capKey, 'i').test(id) || new RegExp(capability.replace(/\./g, '[_\\.]'), 'i').test(id)) {
        pushId(id);
      }
    }

    if (!ordered.length) return 0;

    let fired = 0;
    for (const id of ordered.slice(0, 4)) {
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
  } finally {
    device.__p2748EmitActive = false;
  }
}

/**
 * P2748 — Soft-wrap setCapabilityValue so complementary / raw / EF00 paths
 * that skip safeSet still fire Homey tagged Flows. Idempotent. Never double-fires
 * when L14/safeSet already called emitCapabilityChangedFlows.
 *
 * @param {object} device
 * @returns {{ ok: boolean, wrapped?: boolean }}
 */
function ensureTaggedFlowEmitFromAnyPath(device) {
  if (!device || typeof device !== 'object') return { ok: false };
  if (device._p2748SetCapWrapped) return { ok: true, wrapped: false };
  if (typeof device.setCapabilityValue !== 'function') return { ok: false };

  const orig = device.setCapabilityValue.bind(device);
  device._p2748SetCapWrapped = true;
  device.setCapabilityValue = async function p2748TaggedSetCapabilityValue(capability, value) {
    let previousValue;
    try {
      previousValue = typeof this.getCapabilityValue === 'function'
        ? this.getCapabilityValue(capability)
        : undefined;
    } catch (_e) {
      previousValue = undefined;
    }
    const result = await orig(capability, value);
    // Only emit if L14 path did not already (flag set during emit)
    if (!this.__p2748EmitActive && !/^button(\.|$)/i.test(String(capability || ''))) {
      try {
        void emitCapabilityChangedFlows(this, capability, value, previousValue).catch(() => {});
      } catch (_e) { /* soft */ }
    }
    return result;
  };

  return { ok: true, wrapped: true };
}

module.exports = {
  emitCapabilityChangedFlows,
  ensureTaggedFlowEmitFromAnyPath,
  buildTokensForCard,
  buildEventStyleCandidates,
  CAP_TOKEN_ALIASES,
};
