'use strict';

/**
 * P2634 — TS0004 4-gang switch module heal (SML-04Z family)
 *
 * Sacred couples (Z2M TS0004_switch_module / ZHA Switch_4G_Metering):
 *   _TZ3000_ltt60asa + TS0004
 *   _TZ3000_mmkbptmx + TS0004
 *   _TZ3000_liygxtcq + TS0004
 *
 * WHY: Homey showed "Zigbee unknown" until mfr locked on switch_4gang.
 * Comment: ZCL OnOff EP1–4 + E000/E001 switchType + optional metering on EP1.
 * Pour qui: Homey users with DIN/module 4-gang relays.
 * Quand: onNodeInit after UnifiedSwitchBase.
 * Contre quoi: re-pair as unknown / wrong 1-gang / wall_switch button UI.
 */

const { containsCI } = require('../utils/CaseInsensitiveMatcher');
const { sendTuyaMagicPacket } = require('../zigbee/TuyaMagicPacket');

const FAMILY_MFR = ['ltt60asa', 'mmkbptmx', 'liygxtcq'];

function _identity(device) {
  const mfr = String(
    device.getSetting?.('zb_manufacturer_name')
    || device.getData?.()?.manufacturerName
    || device.getStoreValue?.('zb_manufacturer_name')
    || device.getStoreValue?.('manufacturerName')
    || '',
  );
  const pid = String(
    device.getSetting?.('zb_model_id')
    || device.getData?.()?.productId
    || device.getData?.()?.modelId
    || device.getStoreValue?.('zb_model_id')
    || '',
  );
  return { mfr, pid };
}

function isTs0004SwitchModule(device) {
  try {
    const { mfr, pid } = _identity(device);
    if (!/^TS0004(_switch_module|_power)?$/i.test(pid) && !/^TS0004$/i.test(pid)) {
      return false;
    }
    return FAMILY_MFR.some((frag) => containsCI(mfr, frag));
  } catch (_e) {
    return false;
  }
}

/**
 * Soft-bind OnOff on EP1–4 + configureReporting (Z2M configureMagicPacket sibling).
 */
async function bindFourGangOnOff(device, zclNode) {
  const node = zclNode || device.zclNode;
  let n = 0;
  for (const epNum of [1, 2, 3, 4]) {
    try {
      const ep = node?.endpoints?.[epNum];
      const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
      if (!onOff) continue;
      if (typeof onOff.bind === 'function') {
        await onOff.bind().catch(() => {});
      }
      if (typeof onOff.configureReporting === 'function') {
        await onOff.configureReporting({
          onOff: { minInterval: 0, maxInterval: 300, minChange: 1 },
        }).catch(() => {});
      }
      n += 1;
    } catch (_e) { /* soft */ }
  }
  device.log?.(`[P2634] bound OnOff on ${n}/4 endpoints`);
  return n > 0;
}

/**
 * Apply Homey switch_mode → E001.0xD030 (toggle/state/momentary).
 * Default state for lighting modules (same as ZG-301Z lesson).
 */
async function applyExternalSwitchType(device) {
  const mode = (typeof device.getSetting === 'function' && device.getSetting('switch_mode')) || 'state';
  const map = { toggle: 0, state: 1, momentary: 2 };
  const wanted = map[mode] ?? 1;
  let ok = false;

  try {
    if (typeof device._writeE001Attribute === 'function') {
      ok = (await device._writeE001Attribute('switchMode', wanted)) || ok;
    }
  } catch (_e) { /* soft */ }

  try {
    const ep = device.zclNode?.endpoints?.[1];
    const e001 = ep?.clusters?.tuyaE001
      || ep?.clusters?.manuSpecificTuya3
      || ep?.clusters?.[0xE001]
      || ep?.clusters?.[57345];
    if (e001 && typeof e001.writeAttributes === 'function') {
      await e001.writeAttributes({ switchMode: wanted, switchType: wanted }).catch(() => {});
      ok = true;
    }
  } catch (_e) { /* soft */ }

  device.log?.(`[P2634] switch_mode=${mode} → E001 (${ok ? 'ok' : 'soft-miss'})`);
  return ok;
}

/**
 * Soft-add metering caps when EP1 exposes electrical clusters (ZHA Switch_4G_Metering).
 * Never invent measure_battery — mains module.
 */
async function ensureMeteringCaps(device, zclNode) {
  const ep = (zclNode || device.zclNode)?.endpoints?.[1];
  if (!ep?.clusters) return false;
  const hasElec = !!(
    ep.clusters.electricalMeasurement
    || ep.clusters.haElectricalMeasurement
    || ep.clusters[2820]
    || ep.clusters[0x0B04]
  );
  const hasMeter = !!(
    ep.clusters.metering
    || ep.clusters.seMetering
    || ep.clusters[1794]
    || ep.clusters[0x0702]
  );
  if (!hasElec && !hasMeter) return false;

  for (const cap of ['measure_power', 'measure_voltage', 'measure_current']) {
    try {
      if (!device.hasCapability?.(cap) && typeof device.addCapability === 'function') {
        await device.addCapability(cap).catch(() => {});
      }
    } catch (_e) { /* soft */ }
  }
  // Strip phantom battery if any drift
  for (const phantom of ['measure_battery', 'alarm_battery']) {
    try {
      if (device.hasCapability?.(phantom)) {
        await device.removeCapability(phantom).catch(() => {});
      }
    } catch (_e) { /* soft */ }
  }
  device.log?.('[P2634] metering clusters present — energy caps ensured');
  return true;
}

/**
 * Full L99 heal after switch_4gang onNodeInit.
 */
async function healTs0004SwitchModule(device, zclNode) {
  if (!isTs0004SwitchModule(device)) return false;
  device._ts0004SwitchModule = true;
  device.log?.('[P2634] TS0004 switch-module heal (ltt60asa/mmkbptmx/liygxtcq)');

  await sendTuyaMagicPacket(device, zclNode || device.zclNode, 1, { force: true }).catch(() => {});
  await bindFourGangOnOff(device, zclNode);
  await applyExternalSwitchType(device);
  await ensureMeteringCaps(device, zclNode);

  try {
    if (typeof device._readE001Attributes === 'function') {
      await device._readE001Attributes().catch(() => {});
    }
  } catch (_e) { /* soft */ }

  return true;
}

module.exports = {
  FAMILY_MFR,
  isTs0004SwitchModule,
  bindFourGangOnOff,
  applyExternalSwitchType,
  ensureMeteringCaps,
  healTs0004SwitchModule,
};
