'use strict';

/**
 * MCUVersionHelper — restored (pre-P92.17). Standard TS0601 init:
 * mcuVersionRequest (0x10) then dataQuery (0x03).
 */

const { safeSetTimeout } = require('../utils/safe-timers');

async function configureMcuVersionRequest(device, cluster, options = {}) {
  const { sendDataQuery = true, delayBetween = 100 } = options;
  if (!cluster) {return false;}

  try {
    if (typeof cluster.mcuVersionRequest === 'function') {
      await cluster.mcuVersionRequest({ data: Buffer.from([0x00, 0x02]) });
    } else if (typeof cluster.command === 'function') {
      await cluster.command('mcuVersionRequest', { data: Buffer.from([0x00, 0x02]) }, { disableDefaultResponse: true });
    } else {
      return false;
    }

    if (delayBetween > 0) {
      await new Promise((r) => safeSetTimeout(device, r, delayBetween));
    }
    if (device?._destroyed) {return false;}

    if (sendDataQuery) {
      if (typeof cluster.dataQuery === 'function') {
        await cluster.dataQuery({});
      } else if (typeof cluster.command === 'function') {
        await cluster.command('dataQuery', {}, { disableDefaultResponse: true });
      }
    }

    return true;
  } catch (_err) {
    return false;
  }
}

module.exports = {
  configureMcuVersionRequest,
};
