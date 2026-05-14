'use strict';

/**
 * skill-check.js
 * Validates that drivers follow the required Antigravity and Zero-Defect patterns.
 */

const fs = require('fs');
const path = require('path');
const driversDir = path.resolve(__dirname, '../../drivers');

let failCount = 0;

function checkDriver(driverName) {
  const devicePath = path.join(driversDir, driverName, 'device.js');
  if (!fs.existsSync(devicePath)) return;

  const content = fs.readFileSync(devicePath, 'utf8');
  
  // 1. Check Antigravity pattern (onNodeInit wrapped in _safeInvoke)
  if (!content.includes('async onNodeInit') && !content.includes('onNodeInit(')) {
      // Driver might inherit onNodeInit completely, but usually they have it
  } else {
      if (!content.includes('_safeInvoke') || !content.includes("'onNodeInit'")) {
          console.error(`❌ [SKILL-CHECK] ${driverName}: onNodeInit is NOT wrapped in _safeInvoke`);
          failCount++;
      }
  }

  // 2. Check Battery standardized Mixin usage (if battery capability present)
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const hasBattery = (compose.capabilities || []).includes('measure_battery') || (compose.capabilities || []).includes('alarm_battery');
      if (hasBattery) {
          if (!content.includes('BatteryMixin')) {
              console.error(`❌ [SKILL-CHECK] ${driverName}: Has battery capability but does NOT use BatteryMixin`);
              failCount++;
          }
      }
  }

  // 3. Check for malformed code (the one we fixed earlier)
  if (content.includes("super.onNodeInit({ zclNode \n}, 'onNodeInit')")) {
      console.error(`❌ [SKILL-CHECK] ${driverName}: Malformed super.onNodeInit detected!`);
      failCount++;
  }
}

const drivers = fs.readdirSync(driversDir);
drivers.forEach(checkDriver);

if (failCount > 0) {
  console.error(`\n[SKILL-CHECK] FAILED with ${failCount} issues.`);
  process.exit(1);
} else {
  console.log('[SKILL-CHECK] PASSED! All drivers follow standard patterns.');
}
