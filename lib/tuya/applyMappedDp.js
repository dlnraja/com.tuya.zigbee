'use strict';

/**
 * Apply internal + setting side effects for a resolved DP mapping.
 * Returns false when there is no capability to write (caller must not
 * safeSetCapabilityValue(null), which trips CapHotSwap).
 */
function applyMappedDpSideEffects(device, mapping, dpId, value, log) {
  if (!mapping || value === null || value === undefined) {
    return false;
  }
  if (mapping.internal) {
    device._dpInternal = device._dpInternal || {};
    device._dpInternal[mapping.internal] = value;
  }
  if (mapping.setting) {
    const settingValue = mapping.settingTransform ? mapping.settingTransform(value) : value;
    if (settingValue != null) {
      if (typeof log === 'function') {
        log(`[DP] DP${dpId} -> setting ${mapping.setting} = ${settingValue}`);
      }
      if (typeof device.setSettings === 'function') {
        Promise.resolve(device.setSettings({ [mapping.setting]: settingValue })).catch(() => {});
      }
    }
  }
  return Boolean(mapping.capability);
}

module.exports = { applyMappedDpSideEffects };
