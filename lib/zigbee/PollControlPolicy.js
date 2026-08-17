'use strict';

/**
 * Poll Control (0x0020 / genPollCtrl) — do not bind or answer check-in on sleepy nodes.
 *
 * Z2M unbinds genPollCtrl on Tuya TS0203 / Sonoff SNZB because checkinRsp times
 * out while the end device is asleep and does not improve reporting.
 * Cross-checked: Koenkk/zigbee2mqtt#24938, #24506.
 */

const { isSleepyNoClock, isSleepyRemote } = require('./TimeClusterPolicy');

const POLL_CTRL_NAMES = new Set([
  'pollcontrol',
  'genpollctrl',
  'poll_control',
  '0x0020',
  '0x20',
  '32',
]);

function isPollControlCluster(cluster) {
  if (cluster == null) {return false;}
  if (typeof cluster === 'number') {return cluster === 0x0020 || cluster === 32;}
  const s = String(cluster).toLowerCase().replace(/\s+/g, '');
  if (POLL_CTRL_NAMES.has(s)) {return true;}
  return /poll.?ctrl/i.test(s);
}

function shouldBindPollControl(device) {
  if (!device || device._destroyed) {return false;}
  if (isSleepyRemote(device) || isSleepyNoClock(device)) {return false;}
  return true;
}

function shouldAnswerCheckin(device) {
  return shouldBindPollControl(device);
}

module.exports = {
  isPollControlCluster,
  shouldBindPollControl,
  shouldAnswerCheckin,
};
