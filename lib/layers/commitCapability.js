'use strict';

/**
 * commitCapability — single RX funnel into CrossLayer confirmInbound / L14.
 * P212: production paths (EF00, IAS, battery reporters) call this instead of
 * bare setCapabilityValue so LayerSignalFusion + SmartCap actually run.
 */

/**
 * @param {object} device
 * @param {string} capability
 * @param {*} value
 * @param {string} [source]
 * @param {number} [confidence]
 * @returns {Promise<{ ok: boolean, skipped?: boolean, via?: string, error?: string }>}
 */
async function commitCapability(device, capability, value, source = 'unknown', confidence = 0.85) {
  if (!device || device._destroyed || capability == null || value === undefined) {
    return { ok: false, reason: 'guard' };
  }
  try {
    // Battery: MultiProtocol first (ZCL 0–200, sentinels) — it already calls confirmInbound.
    if (capability === 'measure_battery' && typeof device.ingestBatteryPercent === 'function') {
      return await device.ingestBatteryPercent(value, { protocol: source, confidence });
    }
    if (typeof device.confirmInbound === 'function') {
      return await device.confirmInbound(capability, value, source, confidence);
    }
    if (typeof device.safeSetCapabilityValue === 'function') {
      const r = await device.safeSetCapabilityValue(capability, value, { source, confidence });
      return { ok: r !== false, via: source };
    }
    if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(capability, value);
      return { ok: true, via: 'raw' };
    }
    return { ok: false, reason: 'no-setter' };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Fire-and-forget wrapper for legacy .catch(() => {}) call sites. */
function commitCapabilityCatch(device, capability, value, source, confidence) {
  return commitCapability(device, capability, value, source, confidence).catch(() => ({ ok: false }));
}

module.exports = {
  commitCapability,
  commitCapabilityCatch,
};
