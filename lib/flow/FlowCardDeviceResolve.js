'use strict';

/**
 * P2635 — Shared Homey Flow device/arg/state helpers (switches, buttons, actuators)
 *
 * WHY: Homey SDK3 device triggers with dropdown args require registerRunListener
 * to compare args ↔ state. Passing state={} made same-page button Flows fire for
 * every button (or never, if listener was over-strict without state).
 *
 * Docs: https://apps.developer.homey.app/the-basics/flow
 * Contre quoi: empty state + button dropdown = all/none Flows.
 */

/** Normalize dropdown / scalar Homey flow arg to string id. */
function flowArgId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') {
    if (value.id != null && value.id !== '') return String(value.id);
    if (value.value != null && value.value !== '') return String(value.value);
  }
  return String(value);
}

/**
 * Build trigger state from tokens so dropdown runListeners can match.
 * Homey: trigger(device, tokens, state) — state is what registerRunListener sees.
 */
function stateFromFlowTokens(tokens = {}, extra = {}) {
  const out = { ...extra };
  const button = flowArgId(tokens.button ?? tokens.gang ?? extra.button ?? extra.gang);
  const gang = flowArgId(tokens.gang ?? tokens.button ?? extra.gang ?? extra.button);
  if (button !== undefined) out.button = button;
  if (gang !== undefined) out.gang = gang;
  if (tokens.count !== undefined) out.count = tokens.count;
  if (tokens.action !== undefined) out.action = tokens.action;
  if (tokens.type !== undefined) out.type = tokens.type;
  return out;
}

/**
 * Resolve device from action/condition args (compose injects hidden device arg).
 */
function resolveFlowDevice(args = {}) {
  if (!args || typeof args !== 'object') return null;
  const d = args.device;
  if (!d) return null;
  if (typeof d.getCapabilityValue === 'function' || typeof d.setCapabilityValue === 'function') {
    return d;
  }
  if (d.device && typeof d.device.getCapabilityValue === 'function') return d.device;
  return d;
}

/**
 * Trigger runListener match for button/gang dropdowns.
 * WHY(P2635): if the card filters by button/gang, state MUST carry the same key —
 * never return true when filter arg is set but state is empty (would start ALL Flows).
 */
function shouldRunForDeviceAndButton(args = {}, state = {}) {
  const argButton = flowArgId(args.button);
  const argGang = flowArgId(args.gang);
  const stateButton = flowArgId(state.button);
  const stateGang = flowArgId(state.gang);

  if (argButton !== undefined) {
    const match = stateButton !== undefined ? stateButton : stateGang;
    if (match === undefined) return false;
    return argButton === match;
  }
  if (argGang !== undefined) {
    const match = stateGang !== undefined ? stateGang : stateButton;
    if (match === undefined) return false;
    return argGang === match;
  }

  // Optional legacy device compare when both sides present
  if (args.device && state.device) {
    try {
      const a = args.device.id || args.device;
      const s = state.device.id || state.device;
      if (a && s) return String(a) === String(s);
    } catch (_e) { /* soft */ }
  }
  // No filter args — device-scoped card; Homey already bound the device
  return true;
}

module.exports = {
  flowArgId,
  stateFromFlowTokens,
  resolveFlowDevice,
  shouldRunForDeviceAndButton,
};
