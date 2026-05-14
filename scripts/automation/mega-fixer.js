#!/usr/bin/env node
/**
 * 🛠️ mega-fixer.js - v1.0.0
 * 
 * Part of the Antigravity Autonomous Repair System.
 * Automatically fixes architectural non-compliance across the Tuya fleet.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function log(msg) { console.log(`[MEGA-FIXER] ${msg}`); }

log('🛠️ Starting Mega-Fixer...');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

for (const driverId of drivers) {
  const deviceJsPath = path.join(DRIVERS_DIR, driverId, 'device.js');
  if (!fs.existsSync(deviceJsPath)) continue;

  let content = fs.readFileSync(deviceJsPath, 'utf8');
  let changed = false;

  // 1. Inject markAppCommand into capability listeners
  // Pattern: registerCapabilityListener('onoff', async (value) => { ... })
  const listenerRegex = /this\.registerCapabilityListener\(\s*['"]onoff['"]\s*,\s*async\s*\(\s*value\s*\)\s*=>\s*\{/g;
  if (content.includes('registerCapabilityListener') && !content.includes('markAppCommand')) {
    if (content.match(listenerRegex)) {
      log(`Fixing markAppCommand in '${driverId}'`);
      content = content.replace(listenerRegex, (match) => {
        return `${match}\n      if (typeof this.markAppCommand === 'function') this.markAppCommand(1, value);`;
      });
      changed = true;
    }
  }

  // 2. Add VirtualButtonMixin to WiFi switches if missing
  if (driverId.startsWith('wifi_') && (driverId.includes('switch') || driverId.includes('plug'))) {
    if (!content.includes('VirtualButtonMixin')) {
      log(`Adding VirtualButtonMixin to '${driverId}'`);
      // Inject require
      if (!content.includes('require(\'../../lib/mixins/VirtualButtonMixin\')')) {
        content = content.replace(/'use strict';/, `'use strict';\nconst VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');`);
      }
      // Inject inheritance
      content = content.replace(/extends\s+([A-Za-z0-9_]+)\s*\{/, (match, base) => {
        return `extends VirtualButtonMixin(${base}) {`;
      });
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(deviceJsPath, content);
    log(`✅ Fixed '${driverId}'`);
  }
}

log('====================================================');
log('Mega-Fixer finished.');
