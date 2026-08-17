'use strict';

/**
 * Time cluster (0x000A) policy — respond on request, do not poll sleepy nodes.
 *
 * Homey interviews + Gabriel (forum): periodic genTime reads/writes on battery
 * remotes are chatter nobody needs. LCD / MCU clocks still get proactive sync.
 */

const SLEEPY_PIDS = /TS004[1-6F]|TS0215|TS020[1-7]|TS0203|TS0601_SOS/i;
const SLEEPY_CLASSES = new Set(['button', 'remote', 'sensor', 'doorbell']);
const CLOCK_HINT = /thermostat|trv|climate|lcd|display|weather|clock|zt08/i;

function _ids(device) {
  const settings = typeof device?.getSettings === 'function' ? device.getSettings() : {};
  const data = typeof device?.getData === 'function' ? device.getData() : {};
  const store = typeof device?.getStore === 'function' ? device.getStore() : {};
  const mfr = String(
    settings.zb_manufacturer_name || store.zb_manufacturer_name || data.manufacturerName || '',
  );
  const pid = String(
    settings.zb_model_id || store.zb_model_id || data.modelId || device?.zigbee?.productId || '',
  );
  const driverId = String(device?.driver?.id || device?.driver?.manifest?.id || '');
  const cls = String(device?.driver?.manifest?.class || device?.getClass?.() || '');
  return { mfr, pid, driverId, cls };
}

function isSleepyNoClock(device) {
  const { pid, driverId, cls } = _ids(device);
  if (CLOCK_HINT.test(driverId) || CLOCK_HINT.test(pid)) {return false;}
  if (SLEEPY_CLASSES.has(cls) && !CLOCK_HINT.test(driverId)) {return true;}
  if (SLEEPY_PIDS.test(pid)) {return true;}
  if (/button_wireless|wall_remote|scene_switch|sos_|water_leak|contact_sensor/i.test(driverId)) {
    return true;
  }
  return false;
}

/**
 * Proactive 0x000A write / interval — only for devices that actually keep a clock.
 * Inbound time requests must still be answered regardless.
 */
function shouldProactiveTimeSync(device) {
  if (!device || device._destroyed) {return false;}
  if (device._deviceRequestedTime === true) {return true;}
  if (isSleepyNoClock(device)) {return false;}
  const { driverId, pid } = _ids(device);
  if (CLOCK_HINT.test(driverId) || CLOCK_HINT.test(pid)) {return true;}
  if (typeof device.mainsPowered === 'boolean' ? device.mainsPowered : false) {
    return /thermostat|trv|climate|cover|curtain/i.test(driverId);
  }
  return false;
}

module.exports = {
  isSleepyNoClock,
  shouldProactiveTimeSync,
};
