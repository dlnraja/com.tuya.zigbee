'use strict';

/**
 * CapabilityCleanup - Remove incorrect capabilities from devices
 *
 * Fixes capability issues caused by wrong driver assignment or
 * dynamic capability detection errors.
 */

const { getModelId, getManufacturer, isTuyaDPDevice } = require('./DeviceDataHelper');

/**
 * Capabilities that should NEVER be on certain device types
 */
const FORBIDDEN_CAPABILITIES = {
  // Sensors should NOT have onoff
  'sensor': ['onoff', 'dim'],
  'presence_sensor': ['onoff', 'dim', 'alarm_contact'],
  'motion_sensor': ['onoff', 'dim', 'alarm_contact'],
  'climate_sensor': ['onoff', 'dim', 'alarm_contact', 'alarm_motion'],
  'soil_sensor': ['onoff', 'dim', 'alarm_motion'],

  // Switches should NOT have dim (unless it's a dimmer)
  'switch': ['dim', 'measure_luminance'],
  'socket': ['dim', 'measure_luminance'],

  // USB outlets should NOT have dim
  'usb_outlet': ['dim'],

  // Buttons should NOT have onoff (they send events, not states)
  // EXCEPTION: SOS/Emergency buttons NEED alarm_contact for IAS Zone!
  'button': ['onoff'],
  'emergency_button': ['onoff'],  // Keep alarm_contact for IAS Zone!
  'button_sos': ['onoff'],        // Keep alarm_contact!
};

/**
 * Model-specific forbidden capabilities
 */
const MODEL_FORBIDDEN_CAPS = {
  // TS0002 _TZ3000_h1ipgkwn is USB outlet, not dimmer
  'TS0002/_TZ3000_h1ipgkwn': ['dim'],

  // TS0601 presence sensors
  'TS0601/_TZE200_rhgsbacq': ['onoff', 'alarm_contact'],

  // TS0601 soil/climate sensors
  'TS0601/_TZE284_oitavov2': ['onoff', 'alarm_contact'],
  'TS0601/_TZE284_vvmbj46n': ['onoff', 'alarm_contact', 'alarm_motion'],

  // TS0215A emergency buttons
  'TS0215A/_TZ3000_0dumfk2z': ['onoff'],
};

/**
 * Clean up incorrect capabilities from a device
 * @param {Object} device - Homey device instance
 * @returns {Object} - { removed: string[], kept: string[] }
 */
async function cleanupCapabilities(device) {
  const result = {
    removed: [],
    kept: [],
    errors: []
  };

  try {
    const modelId = getModelId(device);
    const manufacturer = getManufacturer(device);
    const driverName = device.driver?.id || '';
    const deviceClass = device.getClass?.() || '';
    const currentCaps = device.getCapabilities();

    device.log('[CLEANUP] 🧹 Starting capability cleanup...');
    device.log(`[CLEANUP] Model: ${modelId} / ${manufacturer}`);
    device.log(`[CLEANUP] Driver: ${driverName}`);
    device.log(`[CLEANUP] Class: ${deviceClass}`);
    device.log(`[CLEANUP] Current caps: ${currentCaps.join(', ')}`);

    // Build list of forbidden capabilities
    const forbidden = new Set();

    // 1. Check model-specific rules
    const modelKey = `${modelId}/${manufacturer}`;
    if (MODEL_FORBIDDEN_CAPS[modelKey]) {
      MODEL_FORBIDDEN_CAPS[modelKey].forEach(cap => forbidden.add(cap));
      device.log(`[CLEANUP] Model rules applied: ${MODEL_FORBIDDEN_CAPS[modelKey].join(', ')}`);
    }

    // 2. Check device class rules
    if (FORBIDDEN_CAPABILITIES[deviceClass]) {
      FORBIDDEN_CAPABILITIES[deviceClass].forEach(cap => forbidden.add(cap));
    }

    // 3. Check driver name for type hints
    if (driverName.includes('sensor') || driverName.includes('presence') || driverName.includes('motion')) {
      FORBIDDEN_CAPABILITIES['sensor']?.forEach(cap => forbidden.add(cap));
    }
    if (driverName.includes('soil') || driverName.includes('climate')) {
      FORBIDDEN_CAPABILITIES['climate_sensor']?.forEach(cap => forbidden.add(cap));
    }
    if (driverName.includes('button') || driverName.includes('emergency')) {
      FORBIDDEN_CAPABILITIES['button']?.forEach(cap => forbidden.add(cap));
    }
    if (driverName.includes('switch') && !driverName.includes('dimmer')) {
      FORBIDDEN_CAPABILITIES['switch']?.forEach(cap => forbidden.add(cap));
    }

    // 4. Remove forbidden capabilities
    for (const cap of currentCaps) {
      if (forbidden.has(cap)) {
        try {
          await device.removeCapability(cap);
          result.removed.push(cap);
          device.log(`[CLEANUP] ✅ Removed: ${cap}`);
        } catch (err) {
          result.errors.push({ cap, error: err.message });
          device.log(`[CLEANUP] ⚠️ Could not remove ${cap}: ${err.message}`);
        }
      } else {
        result.kept.push(cap);
      }
    }

    // 5. Add missing capabilities for USB outlets
    if (modelId === 'TS0002' && manufacturer === '_TZ3000_h1ipgkwn') {
      device.log('[CLEANUP] ⚡ USB outlet detected - ensuring correct capabilities');

      // Add onoff.usb2 if missing (for second USB port)
      if (!device.hasCapability('onoff.usb2')) {
        try {
          await device.addCapability('onoff.usb2');
          device.log('[CLEANUP] ✅ Added: onoff.usb2');
          result.kept.push('onoff.usb2');
        } catch (err) {
          device.log(`[CLEANUP] ⚠️ Could not add onoff.usb2: ${err.message}`);
        }
      }
    }

    device.log(`[CLEANUP] 🧹 Cleanup complete: removed ${result.removed.length}, kept ${result.kept.length}`);

  } catch (err) {
    device.error('[CLEANUP] Error:', err.message);
    result.errors.push({ cap: 'general', error: err.message });
  }

  return result;
}

/**
 * Quick check if device has wrong capabilities
 * @param {Object} device - Homey device instance
 * @returns {boolean} - True if cleanup needed
 */
function needsCleanup(device) {
  const modelId = getModelId(device);
  const manufacturer = getManufacturer(device);
  const driverName = device.driver?.id || '';
  const currentCaps = device.getCapabilities();

  // Check model-specific
  const modelKey = `${modelId}/${manufacturer}`;
  if (MODEL_FORBIDDEN_CAPS[modelKey]) {
    for (const cap of MODEL_FORBIDDEN_CAPS[modelKey]) {
      if (currentCaps.includes(cap)) return true;
    }
  }

  // Check sensor with onoff
  if (driverName.includes('sensor') && currentCaps.includes('onoff')) {
    return true;
  }

  // Check switch with dim (unless dimmer)
  if (driverName.includes('switch') && !driverName.includes('dimmer') && currentCaps.includes('dim')) {
    return true;
  }

  return false;
}

module.exports = {
  cleanupCapabilities,
  needsCleanup,
  FORBIDDEN_CAPABILITIES,
  MODEL_FORBIDDEN_CAPS
};
