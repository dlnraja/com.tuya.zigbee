'use strict';

/**
 * P2635 — Fleet auto-wire for switch / wall_switch / plug actuator Flow cards.
 *
 * Homey SDK3: driver.flow.compose.json injects hidden device arg → args.device.
 * Contre quoi: missing registerRunListener = Then cards never execute.
 * Soft-resolve via resolveFlowDevice; gang TX via FlowGangControl.
 */

const fs = require('fs');
const path = require('path');
const { resolveFlowDevice } = require('./FlowCardDeviceResolve');
const { setGangOnOff, setAllGangsOnOff } = require('../drivers/FlowGangControl');

const RE_TURN_ON_GANG = /^(.+)_turn_on_gang(\d+)$/i;
const RE_TURN_OFF_GANG = /^(.+)_turn_off_gang(\d+)$/i;
const RE_TOGGLE_GANG = /^(.+)_toggle_gang(\d+)$/i;
const RE_IS_ON_GANG = /^(.+)_gang(\d+)_is_on$/i;
const RE_TURN_ON_ALL = /^(.+)_turn_on_all$/i;
const RE_TURN_OFF_ALL = /^(.+)_turn_off_all$/i;

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

function gangCountFromDriverId(driverId) {
  const m = String(driverId || '').match(/(\d+)\s*gang/i);
  if (m) return Math.max(1, parseInt(m[1], 10));
  if (/switch_1gang|plug$|socket/i.test(driverId)) return 1;
  return 4;
}

/**
 * @param {Homey.Homey} homey
 * @param {{ log?: Function }} [opts]
 */
function autoWireSwitchActuatorFlows(homey, opts = {}) {
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const registered = global.__p2635SwitchFlowAutoWired || (global.__p2635SwitchFlowAutoWired = new Set());
  const stats = { actions: 0, conditions: 0, drivers: 0 };

  let drivers = [];
  try {
    drivers = Object.values(homey.drivers?.getDrivers?.() || {});
  } catch (_e) {
    return stats;
  }

  const getAction = (id) => {
    try { return homey.flow.getActionCard(id); } catch (_e) { return null; }
  };
  const getCondition = (id) => {
    try { return homey.flow.getConditionCard(id); } catch (_e) { return null; }
  };

  for (const driver of drivers) {
    const driverId = driver?.id || '';
    if (!/(^|_)(switch|wall_switch|plug|socket|relay)/i.test(driverId)) continue;
    if (/button_wireless|scene_switch|remote_button/i.test(driverId)) continue;

    let flow = null;
    try {
      const composePath = path.join(process.cwd(), 'drivers', driverId, 'driver.flow.compose.json');
      if (fs.existsSync(composePath)) {
        flow = JSON.parse(fs.readFileSync(composePath));
      }
    } catch (_e) { /* soft */ }
    if (!flow) continue;

    stats.drivers += 1;
    const gangs = gangCountFromDriverId(driverId);

    for (const a of flow.actions || []) {
      const id = a?.id;
      if (!id) continue;

      let m;
      if ((m = id.match(RE_TURN_ON_GANG))) {
        const gang = parseInt(m[2], 10);
        if (safeRegister(getAction(id), async (args) => {
          const device = resolveFlowDevice(args);
          if (!device) return false;
          return setGangOnOff(device, gang, true);
        }, registered, `action:${id}`)) stats.actions += 1;
      } else if ((m = id.match(RE_TURN_OFF_GANG))) {
        const gang = parseInt(m[2], 10);
        if (safeRegister(getAction(id), async (args) => {
          const device = resolveFlowDevice(args);
          if (!device) return false;
          return setGangOnOff(device, gang, false);
        }, registered, `action:${id}`)) stats.actions += 1;
      } else if ((m = id.match(RE_TOGGLE_GANG))) {
        const gang = parseInt(m[2], 10);
        if (safeRegister(getAction(id), async (args) => {
          const device = resolveFlowDevice(args);
          if (!device) return false;
          return setGangOnOff(device, gang, 'toggle');
        }, registered, `action:${id}`)) stats.actions += 1;
      } else if (RE_TURN_ON_ALL.test(id)) {
        if (safeRegister(getAction(id), async (args) => {
          const device = resolveFlowDevice(args);
          if (!device) return false;
          return setAllGangsOnOff(device, gangs, true);
        }, registered, `action:${id}`)) stats.actions += 1;
      } else if (RE_TURN_OFF_ALL.test(id)) {
        if (safeRegister(getAction(id), async (args) => {
          const device = resolveFlowDevice(args);
          if (!device) return false;
          return setAllGangsOnOff(device, gangs, false);
        }, registered, `action:${id}`)) stats.actions += 1;
      }
    }

    for (const c of flow.conditions || []) {
      const id = c?.id;
      if (!id) continue;
      const m = id.match(RE_IS_ON_GANG);
      if (!m) continue;
      const gang = parseInt(m[2], 10);
      if (safeRegister(getCondition(id), async (args) => {
        const device = resolveFlowDevice(args);
        if (!device) return false;
        const cap = gang <= 1 ? 'onoff' : (device.hasCapability?.(`onoff.gang${gang}`) ? `onoff.gang${gang}` : `onoff.${gang}`);
        return device.getCapabilityValue(cap) === true;
      }, registered, `condition:${id}`)) stats.conditions += 1;
    }
  }

  log(`[P2635] Switch/actuator Flow auto-wire: drivers=${stats.drivers} actions=${stats.actions} conditions=${stats.conditions}`);
  return stats;
}

module.exports = {
  autoWireSwitchActuatorFlows,
};
