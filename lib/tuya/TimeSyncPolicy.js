'use strict';
/**
 * Per-device opt-out of Tuya time sync (#110, Z2M #13004): some devices misbehave when the
 * time is pushed to them. Setting `tuya_time_sync` (checkbox, default on) set to off makes every
 * time-sync path skip sending. Absent setting = allowed (unchanged behaviour).
 */
function timeSyncAllowed(device) {
  try {
    if (!device || typeof device.getSetting !== 'function') { return true; }
    const v = device.getSetting('tuya_time_sync');
    return !(v === false || v === 'false' || v === 'off' || v === 0);
  } catch (_) { return true; }
}
module.exports = { timeSyncAllowed };
