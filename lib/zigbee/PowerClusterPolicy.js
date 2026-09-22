'use strict';

/**
 * Power Configuration cluster (0x0001) policy — listen, do not poll sleepy nodes.
 * Same idea as Time 0x000A: remotes/buttons should not get batteryPercentage
 * readAttributes on a timer; inbound reports still apply.
 */

const { isSleepyRemote } = require('./TimeClusterPolicy');

function shouldProactivePowerCfgRead(device) {
  if (!device || device._destroyed) {return false;}
  if (isSleepyRemote(device)) {return false;}
  // WHY(P2685 / Z2M#8072): sacred skipBatteryReporting remotes — never proactive TX
  try {
    const profile = typeof device.getDeviceProfile === 'function' ? device.getDeviceProfile() : null;
    if (profile?.skipBatteryReporting || profile?.noEf00Tx) {return false;}
  } catch (_e) { /* soft */ }
  return true;
}

module.exports = {
  shouldProactivePowerCfgRead,
};
