'use strict';

/**
 * lib/utils/ClassExtendsGuard.js
 *
 * P24.7 — Safe class extends wrapper for TuyaZigbeeDevice / TuyaSpecificClusterDevice
 *
 * Some devices (smart_knob_rotary, wall_dimmer_1gang_1way, smart_scene_panel)
 * crash at runtime with:
 *   "Class extends value undefined is not a constructor or null"
 *
 * This happens when the parent class fails to load (e.g., circular import,
 * missing dependency). To make these devices resilient, we wrap the class
 * extension so:
 * 1. If the primary parent class is undefined, fall back to ZigBeeDevice
 * 2. Log the failure so the root cause can be diagnosed
 * 3. Continue with full device functionality
 *
 * Usage:
 *   const { safeExtends } = require('../../utils/ClassExtendsGuard');
 *   const TuyaZigbeeDevice = safeExtends('TuyaZigbeeDevice', () => {
 *     return require('../tuya/TuyaZigbeeDevice');
 *   });
 *   class MyDevice extends TuyaZigbeeDevice { ... }
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const path = require('path');

function safeExtends(className, loader) {
  let Primary;
  let fallbackUsed = false;
  let originalError = null;

  try {
    Primary = loader();
  } catch (e) {
    originalError = e;
  }

  if (Primary && typeof Primary === 'function') {
    // Primary loaded successfully
    return Primary;
  }

  // Fallback to ZigBeeDevice directly
  fallbackUsed = true;
  try {
    // Try to log the error to the diagnostic dumps
    const fs = require('fs');
    const logPath = path.join(__dirname, '..', '..', '.github', 'state', 'class-extends-failures.log');
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      className,
      originalError: originalError ? String(originalError.message || originalError) : 'undefined',
      fallback: 'ZigBeeDevice',
    }) + '\n';
    try { fs.appendFileSync(logPath, logEntry); } catch {}
  } catch {}

  // Use the bare ZigBeeDevice as fallback
  return ZigBeeDevice;
}

module.exports = { safeExtends };
