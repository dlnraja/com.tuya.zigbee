'use strict';

/**
 * Poll Control (0x0020 / genPollCtrl) — do not bind or answer check-in on sleepy nodes.
 * Z2M unbinds genPollCtrl on Tuya TS0203 / Sonoff SNZB (checkinRsp times out).
 */

const SLEEPY_PIDS = /TS004[1-6F]|TS0215|TS020[1-7]|TS0203|TS0601_SOS|SNZB/i;
const SLEEPY_CLASSES = new Set(['button', 'remote', 'sensor', 'doorbell']);

function _ids(device) {
  try {
    const settings = typeof device?.getSettings === 'function' ? device.getSettings() : {};
    const data = typeof device?.getData === 'function' ? device.getData() : {};
    const store = typeof device?.getStore === 'function' ? device.getStore() : {};
    const pid = String(
      settings.zb_model_id || store.zb_model_id || data.modelId || data.productId || '',
    );
    const driverId = String(device?.driver?.id || device?.driver?.manifest?.id || '');
    const cls = String(device?.driver?.manifest?.class || device?.getClass?.() || '');
    return { pid, driverId, cls };
  } catch (_e) {
    return { pid: '', driverId: '', cls: '' };
  }
}

function isSleepyForPollControl(device) {
  const { pid, driverId, cls } = _ids(device);
  if (SLEEPY_CLASSES.has(cls)) {return true;}
  if (/button_wireless|wall_remote|scene_switch|sos_|water_leak|contact_sensor/i.test(driverId)) {
    return true;
  }
  if (SLEEPY_PIDS.test(pid)) {return true;}
  return false;
}

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
  if (isSleepyForPollControl(device)) {return false;}
  return true;
}

function shouldAnswerCheckin(device) {
  return shouldBindPollControl(device);
}

module.exports = {
  isPollControlCluster,
  shouldBindPollControl,
  shouldAnswerCheckin,
  isSleepyForPollControl,
};
