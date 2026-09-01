'use strict';

/**
 * MCUVersionHelper — TS0601 init: optional mcuVersionRequest (0x10) then dataQuery (0x03).
 *
 * WHY(P2360 / P2296): Battery covers + DISABLE_MCU_VERSION_RESPONSE firmware quirks
 * must NOT send 0x10 (Z2M #28655 mesh flood / pack drain). dataQuery-only is enough.
 */

const { safeSetTimeout } = require('../utils/safe-timers');
const { isBatteryCoverMfr } = require('../helpers/batteryPowerSource');

function _resolveMfr(device) {
  try {
    return device?.getSetting?.('zb_manufacturer_name')
      || device?.getData?.()?.manufacturerName
      || device?.getManufacturerName?.()
      || '';
  } catch {
    return '';
  }
}

/**
 * @param {object} device
 * @returns {boolean} true when 0x10 / version side-effects must be skipped
 */
function shouldSkipMcuVersionRequest(device) {
  try {
    const mfr = _resolveMfr(device);
    if (isBatteryCoverMfr(mfr)) {return true;}
    const MCUFormatDatabase = require('./MCUFormatDatabase');
    const bug = MCUFormatDatabase.getFirmwareBug(mfr);
    return bug?.fix?.type === 'DISABLE_MCU_VERSION_RESPONSE';
  } catch {
    return false;
  }
}

async function configureMcuVersionRequest(device, cluster, options = {}) {
  const { sendDataQuery = true, delayBetween = 100, forceVersionRequest = false } = options;
  if (!cluster) {return false;}

  const skipVersion = !forceVersionRequest && shouldSkipMcuVersionRequest(device);

  try {
    if (!skipVersion) {
      if (typeof cluster.mcuVersionRequest === 'function') {
        await cluster.mcuVersionRequest({ data: Buffer.from([0x00, 0x02]) });
      } else if (typeof cluster.command === 'function') {
        await cluster.command('mcuVersionRequest', { data: Buffer.from([0x00, 0x02]) }, { disableDefaultResponse: true });
      } else if (!sendDataQuery) {
        return false;
      }

      if (delayBetween > 0) {
        await new Promise((r) => safeSetTimeout(device, r, delayBetween));
      }
      if (device?._destroyed) {return false;}
    } else {
      try {
        device?.log?.('[MCU] Skip mcuVersionRequest (battery-cover / firmware quirk)');
      } catch { /* ignore */ }
    }

    if (sendDataQuery) {
      if (typeof cluster.dataQuery === 'function') {
        await cluster.dataQuery({});
      } else if (typeof cluster.command === 'function') {
        await cluster.command('dataQuery', {}, { disableDefaultResponse: true });
      } else if (skipVersion) {
        return false;
      }
    }

    return true;
  } catch (_err) {
    return false;
  }
}

module.exports = {
  configureMcuVersionRequest,
  shouldSkipMcuVersionRequest,
};
