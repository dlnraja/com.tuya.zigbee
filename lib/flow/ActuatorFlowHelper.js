'use strict';

/**
 * P130 — Shared actuator flow helpers.
 * Prefer triggerCapabilityListener ( Homey TX path ) with safeSetCapabilityValue sync,
 * then device helpers / DeviceIOFacade fallbacks.
 */

function isMissingCapabilityListenerError(error) {
  const message = String(error?.message || error || '');
  return /missing capability listener|no capability listener/i.test(message);
}

async function syncCapability(device, capability, value) {
  if (!device) { return; }
  if (typeof device.hasCapability === 'function' && !device.hasCapability(capability)) { return; }
  if (typeof device.safeSetCapabilityValue === 'function') {
    await device.safeSetCapabilityValue(capability, value).catch(() => {});
    return;
  }
  if (typeof device.setCapabilityValue === 'function') {
    await device.setCapabilityValue(capability, value).catch(() => {});
  }
}

function resolveOnoffCapability(device, gang = 1) {
  const candidates = gang <= 1
    ? ['onoff']
    : [`onoff.${gang}`, `onoff.gang${gang}`, `onoff.${gang - 1}`];
  for (const cap of candidates) {
    if (!device?.hasCapability || device.hasCapability(cap)) { return cap; }
  }
  return candidates[0];
}

/**
 * Set an actuator capability via Homey listener + UI sync + optional device helpers.
 */
async function setActuatorCapability(device, capability, value, opts = {}) {
  if (!device) { return false; }

  if (typeof opts.before === 'function') {
    await opts.before(device, capability, value).catch(() => {});
  }

  if (typeof device._setGangOnOff === 'function' && /^onoff(\.|$)/.test(capability)) {
    const gangMatch = capability.match(/onoff(?:\.gang)?\.?(\d+)?/);
    const gang = gangMatch && gangMatch[1] ? Number(gangMatch[1]) : 1;
    try {
      await device._setGangOnOff(gang, value);
      await syncCapability(device, capability, value);
      return true;
    } catch (_) { /* fall through */ }
  }

  if (typeof device.triggerCapabilityListener === 'function') {
    try {
      await device.triggerCapabilityListener(capability, value);
      await syncCapability(device, capability, value);
      return true;
    } catch (error) {
      if (!isMissingCapabilityListenerError(error)) {
        // Still try IO fallbacks below
      }
    }
  }

  if (device.io && typeof device.io.sendDP === 'function' && opts.dp != null) {
    try {
      await device.io.sendDP(opts.dp, value, opts.dpType || 'bool');
      await syncCapability(device, capability, value);
      return true;
    } catch (_) { /* fall through */ }
  }

  if (typeof device.sendTuyaCommand === 'function' && opts.dp != null) {
    try {
      await device.sendTuyaCommand(opts.dp, value, opts.dpType || 'bool');
      await syncCapability(device, capability, value);
      return true;
    } catch (_) { /* fall through */ }
  }

  await syncCapability(device, capability, value);
  return true;
}

async function setOnoff(device, value, gang = 1) {
  const capability = resolveOnoffCapability(device, gang);
  if (value === 'toggle') {
    let current = false;
    try { current = !!device.getCapabilityValue(capability); } catch (_) { /* */ }
    return setActuatorCapability(device, capability, !current);
  }
  return setActuatorCapability(device, capability, !!value);
}

/**
 * Register standard turn_on / turn_off / toggle / is_on cards for a driver prefix.
 */
function registerOnoffFlowCards(driver, prefix, opts = {}) {
  const log = (msg) => { try { driver.log?.(msg); } catch (_) { /* */ } };
  const getAction = (id) => {
    try { return driver.homey.flow.getActionCard(id); } catch (_) { return null; }
  };
  const getCondition = (id) => {
    try { return driver.homey.flow.getConditionCard(id); } catch (_) { return null; }
  };

  const gang = opts.gang || 1;
  const capability = opts.capability || null;

  try {
    const card = getCondition(`${prefix}_is_on`);
    if (card) {
      card.registerRunListener(async (args) => {
        if (!args.device) { return false; }
        const cap = capability || resolveOnoffCapability(args.device, gang);
        return args.device.getCapabilityValue(cap) === true;
      });
    }
  } catch (err) { log(`[FLOW] ${prefix}_is_on: ${err.message}`); }

  try {
    const card = getAction(`${prefix}_turn_on`);
    if (card) {
      card.registerRunListener(async (args) => {
        if (!args.device) { return false; }
        if (capability) { return setActuatorCapability(args.device, capability, true); }
        return setOnoff(args.device, true, gang);
      });
    }
  } catch (err) { log(`[FLOW] ${prefix}_turn_on: ${err.message}`); }

  try {
    const card = getAction(`${prefix}_turn_off`);
    if (card) {
      card.registerRunListener(async (args) => {
        if (!args.device) { return false; }
        if (capability) { return setActuatorCapability(args.device, capability, false); }
        return setOnoff(args.device, false, gang);
      });
    }
  } catch (err) { log(`[FLOW] ${prefix}_turn_off: ${err.message}`); }

  try {
    const card = getAction(`${prefix}_toggle`);
    if (card) {
      card.registerRunListener(async (args) => {
        if (!args.device) { return false; }
        if (capability) {
          const cur = !!args.device.getCapabilityValue(capability);
          return setActuatorCapability(args.device, capability, !cur);
        }
        return setOnoff(args.device, 'toggle', gang);
      });
    }
  } catch (err) { log(`[FLOW] ${prefix}_toggle: ${err.message}`); }

  if (opts.dimCapability || opts.registerDim) {
    const dimCap = opts.dimCapability || 'dim';
    try {
      const card = getAction(`${prefix}_set_dim`) || getAction(`${prefix}_set_brightness`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const raw = args.dim ?? args.brightness ?? args.value;
          if (raw == null) { return false; }
          return setActuatorCapability(args.device, dimCap, Number(raw));
        });
      }
    } catch (err) { log(`[FLOW] ${prefix} dim: ${err.message}`); }
  }

  log(`[FLOW] Actuator onoff cards registered for ${prefix}`);
}

/**
 * Register per-gang turn_on/off/toggle for wifi multi-channel sockets.
 * Cap naming: gang1 → onoff, gang2 → onoff.2, …
 */
function registerGangOnoffFlowCards(driver, prefix, gangCount) {
  for (let gang = 1; gang <= gangCount; gang++) {
    const idBase = `${prefix}_turn_on_gang${gang}`;
    const offId = `${prefix}_turn_off_gang${gang}`;
    const toggleId = `${prefix}_toggle_gang${gang}`;
    const capability = gang === 1 ? 'onoff' : `onoff.${gang}`;

    for (const [id, value] of [[idBase, true], [offId, false]]) {
      try {
        const card = driver.homey.flow.getActionCard(id);
        if (!card) { continue; }
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          return setActuatorCapability(args.device, capability, value);
        });
      } catch (_) { /* card may be absent */ }
    }

    try {
      const card = driver.homey.flow.getActionCard(toggleId);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const cur = !!args.device.getCapabilityValue(capability);
          return setActuatorCapability(args.device, capability, !cur);
        });
      }
    } catch (_) { /* optional */ }
  }
  try { driver.log?.(`[FLOW] Gang onoff cards registered for ${prefix} (${gangCount}ch)`); } catch (_) { /* */ }
}

function registerCoverOpenClose(driver, openId, closeId, opts = {}) {
  const setPos = async (device, position) => {
    if (!device) { return false; }
    if (typeof device.openCover === 'function' && position >= 1) {
      await device.openCover().catch(() => {});
      return true;
    }
    if (typeof device.closeCover === 'function' && position <= 0) {
      await device.closeCover().catch(() => {});
      return true;
    }
    const cap = opts.capability || 'windowcoverings_set';
    return setActuatorCapability(device, cap, position);
  };

  try {
    const card = driver.homey.flow.getActionCard(openId);
    if (card) {
      card.registerRunListener(async (args) => setPos(args.device, 1));
    }
  } catch (_) { /* */ }

  try {
    const card = driver.homey.flow.getActionCard(closeId);
    if (card) {
      card.registerRunListener(async (args) => setPos(args.device, 0));
    }
  } catch (_) { /* */ }
}

function registerAlarmCondition(driver, cardId, capability, expected = true) {
  try {
    const card = driver.homey.flow.getConditionCard(cardId);
    if (!card) { return; }
    card.registerRunListener(async (args) => {
      if (!args.device) { return false; }
      return args.device.getCapabilityValue(capability) === expected;
    });
  } catch (_) { /* */ }
}

module.exports = {
  syncCapability,
  setActuatorCapability,
  setOnoff,
  resolveOnoffCapability,
  registerOnoffFlowCards,
  registerGangOnoffFlowCards,
  registerCoverOpenClose,
  registerAlarmCondition,
};
