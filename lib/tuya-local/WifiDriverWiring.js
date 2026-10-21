'use strict';
/**
 * P2954 — Driver-side wiring for the P2950/P2953 helpers. All optional, bounded, never throws.
 *  - Sub-sockets: forum 154077 #526 (Stijn_Van_Heeswijk) https://community.homey.app/t/154077/526
 *  - Ignored commands: forum 154077 #483 (Andi) https://community.homey.app/t/154077/483
 *  - Cover words from cloud range: forum 154077 #491 (Andi) https://community.homey.app/t/154077/491
 */
const { subSocketPlan } = require('./MultiSocketInference');
const { diagnoseIgnoredCommands, coverTokensFromRange } = require('./WifiLanLessons');

/** Drivers that may gain extra outlet capabilities. Strip already has them natively. */
const SUB_SOCKET_DRIVERS = Object.freeze(['wifi_plug', 'wifi_switch', 'wifi_generic']);

/** Capabilities to add for extra outlets (DP1 stays on the existing `onoff`). */
function subSocketCapabilities(driverId, deviceId, dps) {
  if (!SUB_SOCKET_DRIVERS.includes(driverId)) {return [];}
  return subSocketPlan(deviceId || 'dev', dps)
    .filter((s) => s.dp !== 1)
    .map((s) => ({ dp: s.dp, capability: s.kind === 'usb' ? 'onoff.usb' : `onoff.socket${s.dp}`, title: s.name }));
}

/** Tracks sent vs acknowledged writes per DP; reports once via diagnoseIgnoredCommands. */
class CommandAckTracker {
  constructor() { this.pending = new Map(); this.sent = 0; this.acknowledged = 0; this.reported = false; }
  sentDp(dp) { this.sent++; this.pending.set(String(dp), (this.pending.get(String(dp)) || 0) + 1); }
  received(dps) {
    for (const k of Object.keys(dps || {})) {
      if (this.pending.has(k)) {this.acknowledged++; this.pending.delete(k);}
    }
  }
  check(ctx = {}) {
    if (this.reported) {return null;}
    const d = diagnoseIgnoredCommands({ ...ctx, sent: this.sent, acknowledged: this.acknowledged });
    if (d) {this.reported = true;}
    return d;
  }
}

/** Map cloud-range tokens to a TuyaDeviceTemplates COVER_COMMAND_SETS key, or null. */
function coverCommandSetFromRange(range, sets) {
  const r = coverTokensFromRange(range);
  if (!r || !r.tokens || !sets) {return null;}
  const want = [r.tokens.open, r.tokens.close, r.tokens.stop].map((t) => t === undefined ? undefined : String(t).toLowerCase());
  for (const [name, set] of Object.entries(sets)) {
    if (set.open === want[0] && set.close === want[1] && (want[2] === undefined || set.stop === want[2])) {
      return { name, status: r.status };
    }
  }
  return null;
}

module.exports = { subSocketCapabilities, CommandAckTracker, coverCommandSetFromRange, SUB_SOCKET_DRIVERS };
