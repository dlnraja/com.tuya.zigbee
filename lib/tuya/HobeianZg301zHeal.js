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
const { calmHobeianMesh } = require('../zigbee/MeshFloodCalm');

function isHobeianZg301z(device) {
  try {
    const mfr = String(
      device.getSetting?.('zb_manufacturer_name')
      || device.getData?.()?.manufacturerName
      || device.getStoreValue?.('zb_manufacturer_name')
      || '',
    );
    let pid = String(
      device.getSetting?.('zb_model_id')
      || device.getData?.()?.productId
      || device.getData?.()?.modelId
      || device.getStoreValue?.('zb_model_id')
      || '',
    );
    if (containsCI(mfr, 'HOBEIAN') && /^ZG-301Z$/i.test(pid)) return true;
    // WHY(P2662 / Bastien live mesh): Homey Advanced Settings + API often leave
    // zb_model_id blank while Zigbee tools show HOBEIAN+ZG-301Z. P2632 heal then
    // never ran → phantom measure_power + Energy UI noise. On switch_1gang + HOBEIAN
    // + empty pid, soft-assume ZG-301Z (Bastien fleet: all HOBEIAN 1-gang = ZG-301Z).
    if (containsCI(mfr, 'HOBEIAN') && !String(pid).trim()) {
      const drv = String(device.driver?.id || '');
      if (drv === 'switch_1gang' || /:switch_1gang$/i.test(drv)) return true;
    }
    return false;
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
  device.log?.('[P2632/P2662/P2663] HOBEIAN ZG-301Z heal — clear countdown + force switch_type=state + mesh calm');

  // WHY(P2662): persist missing pid so next boots / diags show ZG-301Z (not blank "-")
  try {
    const curPid = String(device.getSetting?.('zb_model_id') || '').trim();
    if (!curPid) {
      await device.setSettings?.({ zb_model_id: 'ZG-301Z' }).catch(() => {});
      await device.setStoreValue?.('zb_model_id', 'ZG-301Z').catch(() => {});
      device.log?.('[P2662] soft-filled zb_model_id=ZG-301Z (was blank on Homey settings)');
    }
  } catch (_e) { /* soft */ }

  await stripPhantomPowerCaps(device);

  // WHY(P2667 / Bastien diags): class=socket + phantom Energy → WRONG_CLASS_SOCKET warnings.
  // Z2M exposes ZG-301Z as wall switch / lighting module (no metering). Prefer light class.
  try {
    const cls = String(device.getClass?.() || '');
    if (cls === 'socket' && typeof device.setClass === 'function') {
      await device.setClass('light').catch(() => {});
      device.log?.('[P2667] setClass(light) — HOBEIAN ZG-301Z is a lighting switch, not a metered socket');
    }
  } catch (_e) { /* soft */ }

  // WHY(P2668 / Z2M ZG-301Z): exposes NO power/current/voltage — only switch/countdown/switch_type.
  // Compose still declares measure_* for generic 1-gang plugs; strip Energy mains marking.
  try {
    if (typeof device.setEnergy === 'function') {
      await device.setEnergy({
        approximation: { usageConstant: 0 },
      }).catch(() => {});
      device.log?.('[P2668] setEnergy(approximation) — Z2M: no metering on ZG-301Z');
    }
  } catch (_e) { /* soft */ }

  // WHY(P2663): tip 1.0.34 left aggressive electrical reporting — overwrite even if caps linger
  try {
    await calmHobeianMesh(device);
  } catch (e) {
    device.log?.(`[P2663] mesh calm soft-fail: ${e.message}`);
  }
  await forceSwitchTypeState(device);
  await clearOnTimeCountdown(device);

  // Plain ON cancels onWithTimedOff (Z2M note) — ONLY if countdown leftover detected.
  // WHY(P2665): previous heal always called onOff.on() for every lit switch at boot →
  // 8× HOBEIAN stampeded the mesh (~5k TX in Developer Tools).
  try {
    const ep = zclNode?.endpoints?.[1] || device.zclNode?.endpoints?.[1];
    const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff;
    const cur = device.getCapabilityValue?.('onoff');
    let hasCountdown = false;
    if (onOff && typeof onOff.readAttributes === 'function') {
      const attrs = await onOff.readAttributes(['onTime']).catch(() => null);
      const ot = attrs?.onTime;
      hasCountdown = Number(ot) > 0;
    }
    if (hasCountdown && cur === true && onOff && typeof onOff.on === 'function') {
      await onOff.on().catch(() => {});
      await clearOnTimeCountdown(device);
      device.log?.('[P2665] ON nudge only (onTime leftover cleared)');
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
