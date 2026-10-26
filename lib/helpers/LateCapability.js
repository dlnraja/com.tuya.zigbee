'use strict';

/**
 * P3064: add an optional capability the first time the device proves it has the feature
 * (a real report arrives), then write the value. Never at pairing, never mandatory.
 * WHY: a capability declared in driver.compose.json shows an empty tile on every device of the
 * driver; a late add only appears on the exact couple that sends the datapoint.
 * Bounded: one add attempt per capability per device instance; failures are swallowed.
 */
function _usable(device, capability, value) {
  if (!device || typeof capability !== 'string' || value === null || value === undefined) { return false; }
  return !(typeof value === 'number' && !Number.isFinite(value));
}

/** true when the capability is present now (added here if needed). */
async function _ensure(device, capability) {
  if (typeof device.hasCapability !== 'function' || device.hasCapability(capability)) { return true; }
  const tried = device._lateCapTried || (device._lateCapTried = new Set());
  if (tried.has(capability) || tried.size >= 16 || typeof device.addCapability !== 'function') { return false; }
  tried.add(capability);
  await device.addCapability(capability);
  device.log?.(`[LATE-CAP] added ${capability} after a real report`);
  return true;
}

async function ensureAndSet(device, capability, value) {
  if (!_usable(device, capability, value)) { return false; }
  try {
    if (!await _ensure(device, capability)) { return false; }
    const set = typeof device.safeSetCapabilityValue === 'function'
      ? device.safeSetCapabilityValue.bind(device) : device.setCapabilityValue.bind(device);
    await set(capability, value);
    return true;
  } catch (_e) { return false; }
}

module.exports = { ensureAndSet };
