'use strict';

/**
 * Power Configuration cluster (0x0001) policy — listen, do not poll sleepy nodes.
 * Same idea as Time 0x000A: remotes/buttons should not get batteryPercentage
 * readAttributes on a timer; inbound reports still apply.
 *
 * P2689: adaptive reporting helpers via SmartBatteryAdaptivePrecision.
 */

const { isSleepyRemote, isSleepyNoClock } = require('./TimeClusterPolicy');

/**
 * WHY(P2691 / Bastien 885a9901 pile drain): every press was readAttributes
 * powerCfg EP1+EP2 (Timeout) + EF00 DP storm — burns CR2032 even when Flow works.
 * Contre quoi: incomplete profiles (sceneSwitch without skipBatteryReporting).
 * Class rule: sceneSwitch / TS004x / noEf00Tx / skipBatteryReporting → never TX.
 * P2757: also cover sleepy sensors (contact/leak/climate coin) via isSleepyNoClock.
 */
function shouldSkipSleepyRemoteBatteryTx(profile, extra = {}) {
  const device = extra?.device || (profile && typeof profile.hasCapability === 'function' ? profile : null);
  if (profile?.mainsPowered === true || device?.mainsPowered === true) {return false;}
  // WHY(P2727): Bastien boot sets bastien_skip_battery_tx before profiles resolve —
  // tip-lag Homey was still TX-storming remotes while the overlay purged late.
  // (restored 2026-10-11: dropped by the P2755 rewrite)
  try {
    const homey = extra?.homey || device?.homey;
    if (homey?.settings?.get?.('bastien_skip_battery_tx') === true) {return true;}
  } catch (_e) { /* soft */ }
  if (profile?.skipBatteryReporting || profile?.noEf00Tx || profile?.sceneSwitch) {return true;}
  const pid = String(
    profile?.productId
    || device?.getSetting?.('zb_model_id')
    || device?.getData?.()?.productId
    || device?.getData?.()?.modelId
    || ''
  );
  if (/^TS004[12346F]$/i.test(pid)) {return true;}
  if (device && isSleepyRemote(device)) {return true;}
  // WHY(P2757): contact / water_leak / climate coin — no PowerCfg TX storm
  if (device && isSleepyNoClock(device)) {return true;}
  if (device?._forcedDeviceType === 'BUTTON' || device?.isBatteryDevice?.()) {return true;}
  const driverId = String(device?.driver?.id || device?.driver?.manifest?.id || '');
  if (/button|remote|scene_switch|sos|contact|water_leak|climate_sensor|motion_sensor/i.test(driverId)) {
    return true;
  }
  // Energy batteries list coin → skip proactive TX
  try {
    const cells = device?.getEnergy?.()?.batteries || [];
    if (cells.some((b) => /^CR\d+/i.test(String(b)) || /3V_2100|3V_2500/i.test(String(b)))) {
      return true;
    }
  } catch (_e) { /* soft */ }
  return false;
}


function shouldProactivePowerCfgRead(device) {
  if (!device || device._destroyed) {return false;}
  if (isSleepyRemote(device)) {return false;}
  if (isSleepyNoClock(device)) {return false;}
  // WHY(P2685 / Z2M#8072): sacred skipBatteryReporting remotes — never proactive TX
  try {
    const profile = typeof device.getDeviceProfile === 'function' ? device.getDeviceProfile() : null;
    if (shouldSkipSleepyRemoteBatteryTx(profile, { device })) {return false;}
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
  shouldSkipSleepyRemoteBatteryTx,
  shouldProactivePowerCfgRead,
  getAdaptivePowerCfgReporting,
};
