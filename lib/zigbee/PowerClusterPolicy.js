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
  return true;
}

module.exports = {
  shouldProactivePowerCfgRead,
};
