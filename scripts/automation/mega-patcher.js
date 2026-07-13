#!/usr/bin/env node
/**
 * 🛠️ mega-patcher.js - v1.3.0
 * 
 * Part of the Antigravity Autonomous Repair System.
 * Automatically remediates issues identified by mega-audit.js.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const PATCH_STATS = {
  fixed_mixins: 0,
  fixed_bidirectional: 0,
  errors: 0
};

function log(msg) { console.log(`[MEGA-PATCHER] ${msg}`); }

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

for (const driverId of drivers) {
  const deviceJsPath = path.join(DRIVERS_DIR, driverId, 'device.js');
  if (!fs.existsSync(deviceJsPath)) continue;

  let content = fs.readFileSync(deviceJsPath, 'utf8');
  let originalContent = content;
  let modified = false;

  const isSwitchOrPlug = driverId.includes('switch') || driverId.includes('plug') || driverId.includes('dimmer') || driverId.includes('curtain') || driverId.includes('valve') || driverId.includes('breaker') || driverId.includes('dongle') || driverId.includes('radiator') || driverId.includes('bulb') || driverId.includes('light') || driverId.includes('led') || driverId.includes('strip');
  const isSensor = driverId.includes('sensor') || driverId.includes('detector') || driverId.includes('monitor') || driverId.includes('quality') || driverId.includes('contact') || driverId.includes('motion') || driverId.includes('presence');

  let requiredMixins = [];
  
  const isZigbee = !content.includes('ewelink-local') && (content.includes('zigbee') || content.includes('ZigBee') || content.includes('tuya') || content.includes('Tuya'));

  if (isZigbee) {
    if (isSwitchOrPlug) {
      if (!content.includes('PhysicalButtonMixin')) requiredMixins.push('PhysicalButtonMixin');
      if (!content.includes('VirtualButtonMixin')) requiredMixins.push('VirtualButtonMixin');
    }
    if (isSensor) {
      if (!content.includes('BatteryMixin')) requiredMixins.push('BatteryMixin');
    }
  }

  // 1. Add missing imports
  for (const mixin of requiredMixins) {
    let importPath = '';
    if (mixin === 'BatteryMixin') {
      importPath = "const BatteryMixin = require('../../lib/tuya/BatteryMixin');";
    } else {
      importPath = `const ${mixin} = require('../../lib/mixins/${mixin}');`;
    }

    if (!content.includes(mixin)) {
      content = content.replace(/'use strict';\n?/, `'use strict';\n${importPath}\n`);
      modified = true;
    }
  }

  // 2. Apply mixins to class declaration
  if (requiredMixins.length > 0) {
    const classRegex = /class\s+(\w+)\s+extends\s+([\w\(\)]+)\s*\{/;
    const match = content.match(classRegex);
    if (match) {
      const className = match[1];
      let baseClass = match[2];
      
      let newBaseClass = baseClass;
      for (const mixin of requiredMixins) {
        if (!newBaseClass.includes(mixin)) {
          newBaseClass = `${mixin}(${newBaseClass})`;
        }
      }
      
      if (newBaseClass !== baseClass) {
        content = content.replace(classRegex, `class ${className} extends ${newBaseClass} {`);
        modified = true;
        PATCH_STATS.fixed_mixins += requiredMixins.length;
      }
    }
  }

  // 3. Fix Bidirectional Sync (markAppCommand)
  if (content.includes('registerCapabilityListener') && !content.includes('markAppCommand')) {
    if (!content.includes('class UnifiedSwitchBase') && !content.includes('class UnifiedPlugBase') && !content.includes('class TuyaSpecificClusterDevice')) {
      
      // Handle various capability IDs (not just 'onoff')
      const capListenerRegex = /this\.registerCapabilityListener\(\s*([^,]+)\s*,\s*async\s*(?:\(?(\w+)\)?)\s*=>\s*\{/g;
      if (capListenerRegex.test(content)) {
        content = content.replace(capListenerRegex, (match, capId, varName) => {
          // Heuristic to determine gang from capability ID string
          let gangArg = '1';
          if (capId.includes('.usb2')) gangArg = '2';
          else if (capId.includes('.gang2')) gangArg = '2';
          else if (capId.includes('.gang3')) gangArg = '3';
          else if (capId.includes('.gang4')) gangArg = '4';
          
          return `${match} if (typeof this.markAppCommand === 'function') this.markAppCommand(${gangArg}, ${varName});`;
        });
        modified = true;
        PATCH_STATS.fixed_bidirectional++;
      }
    }
  }

  if (modified) {
    try {
      fs.writeFileSync(deviceJsPath, content);
      log(`✅ Patched driver: ${driverId}`);
    } catch (e) {
      log(`❌ Error patching driver ${driverId}: ${e.message}`);
      PATCH_STATS.errors++;
    }
  }
}

log('====================================================');
log(`Patcher completed. Mixins: ${PATCH_STATS.fixed_mixins}, Bidirectional: ${PATCH_STATS.fixed_bidirectional}, Errors: ${PATCH_STATS.errors}`);
