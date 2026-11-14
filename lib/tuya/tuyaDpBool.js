'use strict';

/** True, false, or null when the report is not a Tuya bool. Null must not be stored as false. */
function tuyaDpBool(value) {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '1' || text === 'true' || text === 'on' || text === 'open') {
      return true;
    }
    if (text === '0' || text === 'false' || text === 'off' || text === 'closed') {
      return false;
    }
    return null;
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value) && value.length === 1) {
    if (value[0] === 1) {
      return true;
    }
    if (value[0] === 0) {
      return false;
    }
  }
  return null;
}

module.exports = { tuyaDpBool };
