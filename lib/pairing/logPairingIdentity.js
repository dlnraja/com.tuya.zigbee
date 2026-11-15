'use strict';

/**
 * logPairingIdentity.js (P2366)
 * WHY: Unknown Zigbee Device diags often lack mfr+pid — emit at pairing for next diag.
 * P3290 (L-P3290-02): the log line keeps driver/mfr/pid only. The device name and the IEEE
 * address are personal data: never printed (ieee=present|absent).
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
  if (!driver || !devices?.length) {return;}
  const log = driver.log || console.log;
  for (const d of devices) {
    const id = readPairingIdentity(d);
    log(
      `[${tag}] driver=${driver.id || '?'} mfr=${id.mfr || 'ABSENT'} pid=${id.pid || 'ABSENT'} ieee=${id.ieee ? 'present' : 'absent'}`,
    );
  }
}

module.exports = {
  readPairingIdentity,
  logPairingIdentityBatch,
};
