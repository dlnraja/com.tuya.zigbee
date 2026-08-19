'use strict';

/**
 * Some mains relays never send a ZCL Default Response to setOn/setOff.
 * Waiting 10s only produces Timeout: Expected Response.
 */

const NO_DEFAULT_RESPONSE_PIDS = /ZBMINIR2|BASICZBR3|MINI-ZBD/i;

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

function shouldWaitForDefaultResponse(device) {
  if (!device) {return true;}
  if (NO_DEFAULT_RESPONSE_PIDS.test(_pid(device))) {return false;}
  return true;
}

module.exports = {
  shouldWaitForDefaultResponse,
};
