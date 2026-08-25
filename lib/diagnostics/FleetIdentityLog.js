'use strict';

/**
 * FleetIdentityLog (P2248)
 * WHY: Peter_van_Werkhoven diags (0cea6870 / 1cf775a2 / 634f7b19) never carried
 * zb_manufacturer_name + zb_model_id — couples stayed ABSENT. Always emit a
 * one-line identity dump on init/wake so the next Homey log reveals the couple
 * without inventing pids.
 */

function readZigbeeIdentity(device) {
  const mfr = device?.getSetting?.('zb_manufacturer_name')
    || device?.getData?.()?.manufacturerName
    || device?._protocolInfo?.mfr
    || null;
  const pid = device?.getSetting?.('zb_model_id')
    || device?.getData?.()?.productId
    || device?.getData?.()?.modelId
    || device?._protocolInfo?.pid
    || null;
  const ieee = device?.getData?.()?.ieeeAddress
    || device?.getData?.()?.token
    || null;
  return {
    mfr: mfr ? String(mfr) : null,
    pid: pid ? String(pid) : null,
    ieee: ieee ? String(ieee).slice(0, 23) : null,
    driver: device?.driver?.id || null,
    name: (typeof device?.getName === 'function' ? device.getName() : null) || null,
  };
}

/**
 * @param {object} device Homey device
 * @param {string} [tag='FLEET']
 * @param {object} [extra]
 */
function logFleetIdentity(device, tag = 'FLEET', extra = {}) {
  try {
    const id = readZigbeeIdentity(device);
    const parts = [
      `[${tag}]`,
      id.driver || '?',
      id.name ? `"${id.name}"` : null,
      id.mfr ? `mfr=${id.mfr}` : 'mfr=ABSENT',
      id.pid ? `pid=${id.pid}` : 'pid=ABSENT',
      id.ieee ? `ieee=${id.ieee}` : null,
      ...Object.entries(extra).map(([k, v]) => `${k}=${v}`),
    ].filter(Boolean);
    (device.log || console.log).call(device, parts.join(' '));
    return id;
  } catch (_e) {
    return null;
  }
}

module.exports = {
  readZigbeeIdentity,
  logFleetIdentity,
};
