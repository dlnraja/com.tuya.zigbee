'use strict';

/**
 * IAS leftover EF00 TX skip (P2287 / ias_sleepy).
 * Pure helper — unit-testable without loading DeviceIOFacade graph.
 *
 * WHY: Boot HYBRID-QUERY / queryAllDPs on sleepy IAS bricks mesh.
 * Cluster truth (1280 present, 61184 absent) — not tuyaEF00Manager alone.
 */

function shouldSkipIasOnlyEf00Tx(device) {
  if (!device) { return false; }
  if (device._skipTuyaDataQuery === true || device._iasOnlyProfile === true) {
    return true;
  }
  // WHY(P2285): SH-SC07 / TS0041 remotes — no EF00 in interview; leftover TX kills mesh
  try {
    const profile = typeof device.getDeviceProfile === 'function' ? device.getDeviceProfile() : null;
    if (profile?.noEf00Tx === true) { return true; }
  } catch (_e) { /* soft */ }
  if (device._deviceProfile && device._deviceProfile.type === 'ias_zone') {
    return true;
  }
  let pid = '';
  try {
    pid = String(
      (device.getSetting && device.getSetting('zb_model_id'))
      || (device.getData && device.getData().modelId)
      || (device.getData && device.getData().productId)
      || (device._deviceProfile && device._deviceProfile.productId)
      || ''
    ).toUpperCase();
  } catch (_e) {
    pid = '';
  }
  if (pid === 'TS0207' || pid === 'TS0203' || pid.indexOf('TS0215') === 0) {
    return true;
  }
  // TS0041–44 sleepy remotes: never EF00 TX (Johan #1120 / Z2M — no 0xEF00 cluster)
  if (/^TS004[1-4]$/.test(pid) || pid === 'TS0041A') {
    return true;
  }
  const endpoints = (device.zclNode && device.zclNode.endpoints) || {};
  let hasIas = false;
  let hasEf00 = false;
  const vals = Object.keys(endpoints).map(function (k) { return endpoints[k]; });
  for (let i = 0; i < vals.length; i++) {
    const c = (vals[i] && vals[i].clusters) || {};
    if (c.iasZone || c.ssIasZone || c.iasAce || c[1280] || c['1280'] || c[0x0500] || c[1281] || c['1281'] || c[0x0501]) {
      hasIas = true;
    }
    if (c.tuya || c.manuSpecificTuya || c.tuyaManufacturer || c[61184] || c['61184'] || c[0xEF00]) {
      hasEf00 = true;
    }
  }
  return hasIas && !hasEf00;
}

module.exports = { shouldSkipIasOnlyEf00Tx };
