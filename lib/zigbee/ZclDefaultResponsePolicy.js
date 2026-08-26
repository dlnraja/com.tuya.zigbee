'use strict';

/**
 * Some mains relays (ZBMINIR2, BASICZBR3) never send a ZCL Default Response
 * to setOn/setOff. Waiting 10s for it only produces Timeout: Expected Response.
 * Homey registerCapability can pass waitForResponse: false.
 *
 * WHY P2276/D054 (herdsman-converters #12538):
 * Tuya ZCL OnOff on many TS000x/TS011F/TS130F also omit Default Response under load.
 * Prefer fail-open TX over 10s hang — EF00 path already uses disableDefaultResponse.
 */

const ALWAYS_NO_WAIT = /ZBMINIR2|BASICZBR3|MINI-ZBD/i;
const TUYA_NO_WAIT_PIDS = /TS0001|TS0002|TS0003|TS0004|TS0011|TS0012|TS0013|TS011F|TS130F/i;
const TUYA_MFR = /^_TZ/i;

function _pid(device) {
  try {
    const settings = typeof device?.getSettings === 'function' ? device.getSettings() : {};
    const data = typeof device?.getData === 'function' ? device.getData() : {};
    const store = typeof device?.getStore === 'function' ? device.getStore() : {};
    return String(
      settings.zb_model_id || store.zb_model_id || data.productId || data.modelId || '',
    );
  } catch (_e) {
    return '';
  }
}

function _mfr(device) {
  try {
    const settings = typeof device?.getSettings === 'function' ? device.getSettings() : {};
    const data = typeof device?.getData === 'function' ? device.getData() : {};
    return String(settings.zb_manufacturer_name || data.manufacturerName || '');
  } catch (_e) {
    return '';
  }
}

function shouldWaitForDefaultResponse(device) {
  if (!device) {return true;}
  const pid = _pid(device);
  if (ALWAYS_NO_WAIT.test(pid)) {return false;}
  if (TUYA_NO_WAIT_PIDS.test(pid) && TUYA_MFR.test(_mfr(device))) {return false;}
  return true;
}

module.exports = {
  shouldWaitForDefaultResponse,
};
