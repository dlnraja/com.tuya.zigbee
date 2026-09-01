'use strict';

/**
 * logPairingIdentity.js (P2366)
 * WHY: Unknown Zigbee Device diags often lack mfr+pid — emit at pairing for next diag.
 */

function readPairingIdentity(device) {
  const data = device?.data || {};
  const settings = device?.settings || {};
  return {
    mfr: settings.zb_manufacturer_name
      || data.manufacturerName
      || settings.manufacturerName
      || null,
    pid: settings.zb_model_id
      || data.productId
      || data.modelId
      || null,
    ieee: data.ieeeAddress || data.token || settings.zb_ieee_address || null,
    name: device?.name || null,
  };
}

function logPairingIdentityBatch(driver, devices, tag = 'PAIR-ID') {
  if (!driver || !devices?.length) return;
  const log = driver.log || console.log;
  for (const d of devices) {
    const id = readPairingIdentity(d);
    log(
      `[${tag}] driver=${driver.id || '?'} name=${id.name || '?'} mfr=${id.mfr || 'ABSENT'} pid=${id.pid || 'ABSENT'} ieee=${id.ieee ? String(id.ieee).slice(0, 18) : '—'}`,
    );
  }
}

module.exports = {
  readPairingIdentity,
  logPairingIdentityBatch,
};
