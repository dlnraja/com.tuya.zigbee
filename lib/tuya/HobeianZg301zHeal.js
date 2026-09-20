'use strict';

/**
 * P2632 — HOBEIAN ZG-301Z wall module heal (Bastien kitchen light)
 *
 * Symptom: light turns off ~5s after ON without a second click.
 * Z2M WHD02 / ZG-301Z: tuyaOnOff({ switchType: true, onOffCountdown: true })
 *   - countdown uses genOnOff onWithTimedOff (onTime seconds)
 *   - switch_type momentary = pulse then off
 *
 * Contre quoi: leftover onTime=5 or switchMode=momentary keeps auto-off.
 */

const { containsCI } = require('../utils/CaseInsensitiveMatcher');

function isHobeianZg301z(device) {
  try {
    const mfr = String(
      device.getSetting?.('zb_manufacturer_name')
      || device.getData?.()?.manufacturerName
      || '',
    );
    const pid = String(
      device.getSetting?.('zb_model_id')
      || device.getData?.()?.productId
      || device.getData?.()?.modelId
      || '',
    );
    return containsCI(mfr, 'HOBEIAN') && /^ZG-301Z$/i.test(pid);
  } catch (_e) {
    return false;
  }
}

async function clearOnTimeCountdown(device) {
  const ep = device.zclNode?.endpoints?.[1];
  const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
  if (!onOff) return false;
  try {
    if (typeof onOff.writeAttributes === 'function') {
      await onOff.writeAttributes({ onTime: 0 }).catch(() => {});
    }
    if (typeof onOff.writeAttributesRaw === 'function') {
      await onOff.writeAttributesRaw([{ id: 0x4001, value: 0 }]).catch(() => {}); // onTime
    }
    device.log?.('[P2632] cleared genOnOff onTime/countdown');
    return true;
  } catch (e) {
    device.log?.(`[P2632] clear onTime soft-fail: ${e.message}`);
    return false;
  }
}

/**
 * Force switch type to state (1) — lighting stays on until commanded off.
 * Paths: E001.switchMode, OnOff 0x8004, manuSpecificTuya3.switchType
 */
async function forceSwitchTypeState(device) {
  const wanted = 1; // state (Z2M: toggle=0, state=1, momentary=2)
  let ok = false;

  try {
    if (typeof device._writeE001Attribute === 'function') {
      ok = (await device._writeE001Attribute('switchMode', wanted)) || ok;
    }
  } catch (_e) { /* soft */ }

  try {
    if (typeof device._writeOnOffAttribute === 'function') {
      ok = (await device._writeOnOffAttribute('switchMode', wanted)) || ok;
    }
  } catch (_e) { /* soft */ }

  try {
    const ep = device.zclNode?.endpoints?.[1];
    const tuya3 = ep?.clusters?.manuSpecificTuya3
      || ep?.clusters?.tuyaE001
      || ep?.clusters?.[0xE001];
    if (tuya3 && typeof tuya3.writeAttributes === 'function') {
      await tuya3.writeAttributes({ switchType: wanted, switchMode: wanted }).catch(() => {});
      ok = true;
    }
  } catch (_e) { /* soft */ }

  try {
    await device.setSettings?.({ switch_mode: 'state' }).catch(() => {});
  } catch (_e) { /* soft */ }

  device.log?.(`[P2632] force switch_type=state (ok=${ok})`);
  return ok;
}

async function stripPhantomPowerCaps(device) {
  for (const cap of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']) {
    try {
      if (device.hasCapability?.(cap)) {
        await device.removeCapability(cap).catch(() => {});
        device.log?.(`[P2632] stripped phantom ${cap}`);
      }
    } catch (_e) { /* soft */ }
  }
}

/**
 * Call after onNodeInit for HOBEIAN+ZG-301Z.
 */
async function healHobeianZg301z(device, zclNode) {
  if (!isHobeianZg301z(device)) return false;
  device._hobeianZg301z = true;
  device.log?.('[P2632] HOBEIAN ZG-301Z heal — clear countdown + force switch_type=state');

  await stripPhantomPowerCaps(device);
  await forceSwitchTypeState(device);
  await clearOnTimeCountdown(device);

  // Plain ON cancels onWithTimedOff (Z2M note) — nudge if currently on
  try {
    const ep = zclNode?.endpoints?.[1] || device.zclNode?.endpoints?.[1];
    const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff;
    const cur = device.getCapabilityValue?.('onoff');
    if (cur === true && onOff && typeof onOff.on === 'function') {
      await onOff.on().catch(() => {});
      await clearOnTimeCountdown(device);
    }
  } catch (_e) { /* soft */ }

  // Wrap TX: after every ON, clear leftover timed-off
  if (!device._p2632OnOffWrapped && typeof device._setGangOnOff === 'function') {
    const orig = device._setGangOnOff.bind(device);
    device._setGangOnOff = async (gang, value) => {
      await orig(gang, value);
      if (value) await clearOnTimeCountdown(device);
    };
    device._p2632OnOffWrapped = true;
  }

  return true;
}

module.exports = {
  isHobeianZg301z,
  clearOnTimeCountdown,
  forceSwitchTypeState,
  stripPhantomPowerCaps,
  healHobeianZg301z,
};
