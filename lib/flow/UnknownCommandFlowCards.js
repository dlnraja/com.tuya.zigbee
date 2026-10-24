'use strict';

/**
 * P3016: app-level Flow cards for unknown commands and DPs.
 *  - trigger   unknown_command_received  (optional device filter)
 *  - trigger   inferred_button_action    (optional device filter, optional action filter)
 *  - condition last_inferred_action_is   (device, action, minutes)
 *  - action    unknown_commands_diag     (device → token json, no personal data)
 * Each card is registered only when it is declared in the manifest (FlowCardPresence), so a
 * pruned build such as Bastien's never hits invalid_flow_card_id. Never throws.
 */

const { isCardDeclared } = require('./FlowCardPresence');
const Engine = require('../zigbee/UnknownCommandEngine');

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
  return done;
}

module.exports = { register, matchDevice, matchAction, argDeviceId };
