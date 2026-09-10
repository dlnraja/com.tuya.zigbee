'use strict';

/**
 * P2449 — Auto-wire declared flow cards that were historically dead.
 *
 * Optimized: single-pass card classification, early skip empty flows,
 * cached brightness_changed ids per driver for emit path.
 *
 * Dual-app: BOTH (flow reliability).
 */

const { setActuatorCapability } = require('./ActuatorFlowHelper');

const RE_BRIGHTNESS_CHANGED = /brightness_changed/;
const RE_SCENE_RECALL = /scene_recall$/;
const RE_ROTATE = /(?:press_and_)?rotate_(?:left|right)$/;
const RE_BRIGHTNESS_ABOVE = /brightness_above$/;
const RE_SET_BRIGHT = /(?:set_brightness|set_dim)$/;

function normalizeDim(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 1) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function getDimPercent(device) {
  if (typeof device.getKnobBrightnessPercent === 'function') {
    return device.getKnobBrightnessPercent();
  }
  const v = Number(device.getCapabilityValue?.('dim') ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v > 1 ? v : v * 100);
}

function safeRegister(card, handler, registered, key) {
  if (!card || typeof card.registerRunListener !== 'function') return false;
  if (registered.has(key)) return false;
  try {
    card.registerRunListener(handler);
    registered.add(key);
    return true;
  } catch (err) {
    if (/already registered/i.test(String(err?.message || ''))) {
      registered.add(key);
      return true;
    }
    return false;
  }
}

function getFlowGetter(homey, kind) {
  const flow = homey?.flow;
  if (!flow) return null;
  if (kind === 'trigger') return (id) => {
    try { return flow.getDeviceTriggerCard(id); } catch (_e) { return null; }
  };
  if (kind === 'condition') return (id) => {
    try { return flow.getConditionCard(id); } catch (_e) { return null; }
  };
  return (id) => {
    try { return flow.getActionCard(id); } catch (_e) { return null; }
  };
}

/**
 * @param {Homey.Homey} homey
 * @param {{ log?: Function }} [opts]
 * @returns {{ triggers: number, conditions: number, actions: number, drivers: number }}
 */
function autoWireDeclaredFlowCards(homey, opts = {}) {
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const registered = global.__p2449FlowAutoWired || (global.__p2449FlowAutoWired = new Set());
  const stats = { triggers: 0, conditions: 0, actions: 0, drivers: 0 };

  let drivers = [];
  try {
    drivers = Object.values(homey.drivers?.getDrivers?.() || {});
  } catch (_e) {
    return stats;
  }

  const getTrigger = getFlowGetter(homey, 'trigger');
  const getCondition = getFlowGetter(homey, 'condition');
  const getAction = getFlowGetter(homey, 'action');
  if (!getTrigger || !getCondition || !getAction) return stats;

  const triggerHandler = async (args) => !!args.device;

  for (const driver of drivers) {
    const flow = driver.manifest?.flow;
    if (!flow) continue;

    const triggers = flow.triggers;
    const conditions = flow.conditions;
    const actions = flow.actions;
    if ((!triggers || !triggers.length)
      && (!conditions || !conditions.length)
      && (!actions || !actions.length)) {
      continue;
    }

    stats.drivers += 1;
    const driverId = String(driver.id || driver.manifest?.id || '');

    // Cache brightness_changed card ids once for emitBrightnessChanged
    if (driverId && triggers?.length && !driver.__p2449BrightnessChangedIds) {
      const ids = [];
      for (const t of triggers) {
        if (t?.id && RE_BRIGHTNESS_CHANGED.test(t.id)) ids.push(t.id);
      }
      if (!ids.includes(`${driverId}_brightness_changed`)) {
        ids.unshift(`${driverId}_brightness_changed`);
      }
      driver.__p2449BrightnessChangedIds = ids;
    }

    if (triggers) {
      for (const t of triggers) {
        const id = t?.id;
        if (!id || typeof id !== 'string') continue;
        if (!RE_BRIGHTNESS_CHANGED.test(id)
          && !RE_SCENE_RECALL.test(id)
          && !RE_ROTATE.test(id)) {
          continue;
        }
        const key = `trigger:${id}`;
        if (safeRegister(getTrigger(id), triggerHandler, registered, key)) {
          stats.triggers += 1;
        }
      }
    }

    if (conditions) {
      for (const c of conditions) {
        const id = c?.id;
        if (!id || !RE_BRIGHTNESS_ABOVE.test(id)) continue;
        const key = `condition:${id}`;
        if (safeRegister(getCondition(id), async (args) => {
          if (!args.device) return false;
          return getDimPercent(args.device) > Number(args.level ?? args.threshold ?? 0);
        }, registered, key)) {
          stats.conditions += 1;
        }
      }
    }

    if (actions) {
      for (const a of actions) {
        const id = a?.id;
        if (!id || !RE_SET_BRIGHT.test(id)) continue;
        const key = `action:${id}`;
        if (safeRegister(getAction(id), async (args) => {
          if (!args.device) return false;
          const raw = args.brightness ?? args.dim ?? args.value;
          if (raw == null) return false;
          if (typeof args.device.setKnobBrightnessPercent === 'function') {
            return args.device.setKnobBrightnessPercent(raw);
          }
          const dim = normalizeDim(raw);
          if (dim == null) return false;
          return setActuatorCapability(args.device, 'dim', dim);
        }, registered, key)) {
          stats.actions += 1;
        }
      }
    }
  }

  log(`[P2449] auto-wired T${stats.triggers}/C${stats.conditions}/A${stats.actions} across ${stats.drivers} drivers`);
  return stats;
}

/**
 * Emit brightness_changed for the device's declared card ids (best-effort).
 * Uses cached driver.__p2449BrightnessChangedIds when available.
 */
async function emitBrightnessChanged(device, brightnessPercent) {
  if (!device?.homey?.flow || device._destroyed) return;

  const now = Date.now();
  if (device._lastBrightnessFlowTs && now - device._lastBrightnessFlowTs < 250) return;
  device._lastBrightnessFlowTs = now;

  const driverId = String(device.driver?.id || '');
  if (!driverId) return;

  const brightness = Number.isFinite(Number(brightnessPercent))
    ? Math.round(Number(brightnessPercent))
    : getDimPercent(device);

  let candidates = device.driver?.__p2449BrightnessChangedIds;
  if (!Array.isArray(candidates) || !candidates.length) {
    candidates = [`${driverId}_brightness_changed`];
    try {
      const declared = device.driver?.manifest?.flow?.triggers;
      if (Array.isArray(declared)) {
        for (const t of declared) {
          if (t?.id && RE_BRIGHTNESS_CHANGED.test(t.id) && !candidates.includes(t.id)) {
            candidates.push(t.id);
          }
        }
      }
      if (device.driver) device.driver.__p2449BrightnessChangedIds = candidates;
    } catch (_e) { /* optional */ }
  }

  const tokens = { brightness };
  for (let i = 0; i < candidates.length; i++) {
    const id = candidates[i];
    try {
      const card = device.homey.flow.getDeviceTriggerCard(id);
      if (card && typeof card.trigger === 'function') {
        await card.trigger(device, tokens).catch(() => {});
      }
    } catch (_e) { /* optional */ }
  }
}

module.exports = {
  autoWireDeclaredFlowCards,
  emitBrightnessChanged,
  normalizeDim,
  getDimPercent,
};
