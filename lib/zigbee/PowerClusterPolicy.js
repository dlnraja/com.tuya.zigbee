'use strict';

/**
 * Power Configuration cluster (0x0001) policy — listen, do not poll sleepy nodes.
 * Same idea as Time 0x000A: remotes/buttons should not get batteryPercentage
 * readAttributes on a timer; inbound reports still apply.
 *
 * P2689: adaptive reporting helpers via SmartBatteryAdaptivePrecision.
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

/**
 * P2689 — reporting config for non-sleepy ZCL battery devices.
 */
function getAdaptivePowerCfgReporting(device) {
  try {
    const {
      buildAdaptiveReportingConfig,
    } = require('../battery/SmartBatteryAdaptivePrecision');
    const chem = device?.getEnergy?.()?.batteries?.[0]
      || device?.getStoreValue?.('battery_type')
      || 'CR2032';
    const percent = device?.getCapabilityValue?.('measure_battery');
    return buildAdaptiveReportingConfig({ chemistry: chem, percent });
  } catch (_e) {
    return { minInterval: 3600, maxInterval: 43200, minChange: 2, band: 'mid', chemistryClass: 'coin' };
  }
}

module.exports = {
  shouldProactivePowerCfgRead,
  getAdaptivePowerCfgReporting,
};
