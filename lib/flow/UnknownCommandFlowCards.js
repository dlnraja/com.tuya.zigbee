'use strict';

/**
 * P3016: app-level Flow cards for unknown commands and DPs.
 *  - trigger   unknown_command_received  (optional device filter)
 *  - trigger   inferred_button_action    (optional device filter, optional action filter)
 *  - condition last_inferred_action_is   (device, action, minutes)
 *  - action    unknown_commands_diag     (device → token json, no personal data)
 *  - action    unknown_command_teach     (device, pattern, action, button) — P3017 manual mapping
 *  - action    unknown_command_forget    (device, pattern) — P3017
 * Each card is registered only when it is declared in the manifest (FlowCardPresence), so a
 * pruned build such as Bastien's never hits invalid_flow_card_id. Never throws.
 */

const { isCardDeclared } = require('./FlowCardPresence');
const Engine = require('../zigbee/UnknownCommandEngine');
const Learning = require('../zigbee/UnknownLearning');

const PATTERN_RE = /^(f:ep\d{1,3}:0x[0-9a-f]{4}:\d{1,3}:([0-9a-f]{0,4}|len\d{1,4})|dp:\d{1,3}:(raw|bool|value|string|enum|bitmap|unknown):(n|\d{1,3}|len\d{1,4}))$/i;
const TEACH_ACTIONS = Object.freeze(['single', 'double', 'long', 'release', 'rotate_left', 'rotate_right', 'scene', 'on', 'off', 'toggle', 'ignore']);

/** Normalise a pattern typed by the user to the engine key form, or null when invalid. */
function normalizePattern(text) {
  const t = String(text == null ? '' : text).trim();
  if (!PATTERN_RE.test(t)) { return null; }
  if (t[0] === 'f') {
    const p = t.split(':');
    p[2] = `0x${p[2].slice(2).toUpperCase()}`;
    p[4] = p[4].toLowerCase();
    return p.join(':');
  }
  return t.toLowerCase();
}

function _err(msg) { return new Error(msg); }

async function teachRun(args) {
  const dev = args && args.device;
  if (!dev) { throw _err('No device selected / Aucun appareil sélectionné'); }
  const key = normalizePattern(args.pattern);
  if (!key) { throw _err('Invalid pattern: copy it from the "Unknown command received" token, e.g. f:ep1:0x0006:253:00 or dp:101:enum:0 / Motif invalide'); }
  const a = args.action && typeof args.action === 'object' ? args.action.id : args.action;
  if (!TEACH_ACTIONS.includes(a)) { throw _err(`Invalid action: ${a}`); }
  const n = Number(args.button);
  const button = Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
  if (!Learning.teach(dev, key, a, button)) { throw _err('Could not save the mapping / Échec de l\'enregistrement'); }
  try { if (typeof dev.log === 'function') { dev.log(`[UNKNOWN-TEACH] ${key} → ${a}#${button} (user)`); } } catch (_e) { /* soft */ }
  return true;
}

async function forgetRun(args) {
  const dev = args && args.device;
  if (!dev) { throw _err('No device selected / Aucun appareil sélectionné'); }
  const key = normalizePattern(args.pattern);
  if (!key) { throw _err('Invalid pattern / Motif invalide'); }
  Learning.forget(dev, key);
  return true;
}

function argDeviceId(dev) {
  if (!dev) { return null; }
  try { return (typeof dev.getData === 'function' && dev.getData() && dev.getData().id) || dev.id || null; } catch (_e) { return dev.id || null; }
}

function matchDevice(args, state) {
  const want = argDeviceId(args && args.device);
  if (!want) { return true; }
  return !state || !state.deviceId || want === state.deviceId;
}

function matchAction(args, state) {
  const a = args && args.action;
  const want = a && typeof a === 'object' ? a.id : a;
  if (!want || want === 'any') { return true; }
  return !!state && state.action === want;
}

function register(homey, log = () => {}) {
  const done = [];
  const safe = (kind, id, fn) => {
    try {
      if (!homey || !homey.flow || !isCardDeclared(homey, kind, id)) { return; }
      const card = kind === 'trigger' ? homey.flow.getTriggerCard(id)
        : kind === 'condition' ? homey.flow.getConditionCard(id) : homey.flow.getActionCard(id);
      if (!card || typeof card.registerRunListener !== 'function') { return; }
      card.registerRunListener(fn);
      done.push(id);
    } catch (e) {
      log(`[UNKNOWN-FLOW] ${id} not registered: ${e && e.message}`);
    }
  };
  safe('trigger', 'unknown_command_received', async (args, state) => matchDevice(args, state));
  safe('trigger', 'inferred_button_action', async (args, state) => matchDevice(args, state) && matchAction(args, state));
  safe('condition', 'last_inferred_action_is', async (args) => {
    const a = args && args.action;
    return Engine.lastActionIs(argDeviceId(args && args.device), a && typeof a === 'object' ? a.id : a, args && args.minutes);
  });
  safe('action', 'unknown_commands_diag', async (args) => {
    const d = Engine.diagExport(args && args.device);
    return { json: JSON.stringify(d).slice(0, 8000), count: d.learned.length };
  });
  safe('action', 'unknown_command_teach', teachRun);
  safe('action', 'unknown_command_forget', forgetRun);
  return done;
}

module.exports = { register, matchDevice, matchAction, argDeviceId, normalizePattern, teachRun, forgetRun, TEACH_ACTIONS };
