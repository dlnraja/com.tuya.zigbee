#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * IMPLEMENT TIME SYNCHRONIZATION
 * Ajoute la synchronisation time/date pour devices Tuya Zigbee
 * 
 * PROTOCOLE TUYA ZIGBEE:
 * - Cluster Time (0x000A)
 * - Attribute: time (0x0000) - Epoch UTC en secondes depuis 2000-01-01
 * - Attribute: timeStatus (0x0001) - Master/Synchronized status
 * - Requis pour: Thermostats, Climate sensors, Schedules, Logs
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🕐 IMPLEMENT TIME SYNCHRONIZATION FOR TUYA DEVICES\n');
console.log('═'.repeat(80));

const TIME_SYNC_CODE = `
  /**
   * Setup Time Synchronization
   * Required for Tuya devices to function properly
   */
  async setupTimeSync() {
    try {
      // Time cluster synchronization
      if (this.zclNode.endpoints[1]?.clusters?.time) {
        this.log('Setting up time synchronization...');
        
        // Calculate Zigbee epoch time (seconds since 2000-01-01 00:00:00 UTC)
        const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
        const currentTime = Date.now();
        const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);
        
        // Write time to device
        await this.zclNode.endpoints[1].clusters.time.writeAttributes({
          time: zigbeeTime,
          timeStatus: {
            master: true,
            synchronized: true,
            masterZoneDst: false,
            superseding: false
          }
        }).catch(err => this.log('Time sync write failed (non-critical):', err.message));
        
        // Setup periodic time sync (every 24 hours)
        this.timeSyncInterval = setInterval(async () => {
          const newZigbeeTime = Math.floor((Date.now() - zigbeeEpochStart) / 1000);
          await this.zclNode.endpoints[1].clusters.time.writeAttributes({
            time: newZigbeeTime
          }).catch(err => this.log('Time resync failed:', err.message));
          this.log('Time resynchronized');
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        this.log('Time synchronization configured');
      }
    } catch (err) {
      this.error('Time sync setup failed (non-critical):', err);
    }
  }
  
  /**
   * Cleanup time sync interval on device removal
   */
  async onDeleted() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
    }
    await super.onDeleted?.();
  }
`;

// ═══════════════════════════════════════════════════════════════════
// IDENTIFY DRIVERS NEEDING TIME SYNC
// ═══════════════════════════════════════════════════════════════════

console.log('\n🔍 Analyzing drivers for time sync requirements...\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() && !d.startsWith('.')
);

const needsTimeSync = [];

drivers.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  const deviceFile = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(composeFile) || !fs.existsSync(deviceFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const deviceCode = fs.readFileSync(deviceFile, 'utf8');
    
    // Devices that typically need time sync
    const needsSync = 
      driverName.includes('thermostat') ||
      driverName.includes('climate') ||
      driverName.includes('radiator') ||
      driverName.includes('hvac') ||
      driverName.includes('schedule') ||
      compose.capabilities?.some(c => 
        c.includes('target_temperature') || 
        c.includes('thermostat') ||
        c.includes('mode')
      );
    
    // Check if time sync not already implemented
    if (needsSync && !deviceCode.includes('setupTimeSync')) {
      needsTimeSync.push(driverName);
    }
    
  } catch (e) {
    // Skip invalid files
  }
});

console.log(`Found ${needsTimeSync.length} drivers needing time sync\n`);

// ═══════════════════════════════════════════════════════════════════
// IMPLEMENT TIME SYNC
// ═══════════════════════════════════════════════════════════════════

console.log('🔧 Implementing time synchronization...\n');

let implemented = 0;
let errors = 0;

needsTimeSync.forEach(driverName => {
  const deviceFile = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  try {
    let code = fs.readFileSync(deviceFile, 'utf8');
    
    // Find onNodeInit method
    if (!code.includes('async onNodeInit()')) {
      errors++;
      return;
    }
    
    // Add time sync call in onNodeInit
    if (!code.includes('setupTimeSync')) {
      code = code.replace(
        /async onNodeInit\(\)\s*\{/,
        match => match + '\n    // Setup time synchronization for Tuya device\n    await this.setupTimeSync();\n'
      );
      
      // Add method before last closing brace
      const classEndRegex = /\n\}\n\nmodule\.exports/;
      code = code.replace(classEndRegex, TIME_SYNC_CODE + '\n}\n\nmodule.exports');
      
      fs.writeFileSync(deviceFile, code);
      implemented++;
      
      if (implemented <= 15) {
        console.log(`  ✅ ${driverName}`);
      }
    }
    
  } catch (e) {
    console.error(`  ❌ ${driverName}:`, e.message);
    errors++;
  }
});

if (implemented > 15) {
  console.log(`  ... and ${implemented - 15} more`);
}

// ═══════════════════════════════════════════════════════════════════
// ADD TIME SYNC TO ALL TUYA DEVICES (UNIVERSAL)
// ═══════════════════════════════════════════════════════════════════

console.log('\n═'.repeat(80));
console.log('\n🌐 Adding universal time sync to all Tuya devices...\n');

let universalAdded = 0;

drivers.forEach(driverName => {
  const deviceFile = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(deviceFile)) return;
  
  try {
    let code = fs.readFileSync(deviceFile, 'utf8');
    
    // Skip if already has time sync
    if (code.includes('setupTimeSync')) return;
    
    // Skip if no onNodeInit
    if (!code.includes('async onNodeInit()')) return;
    
    // Add time sync (non-blocking, won't break if device doesn't support)
    code = code.replace(
      /async onNodeInit\(\)\s*\{/,
      match => match + '\n    // Time sync (Tuya devices)\n    this.setupTimeSync().catch(() => {});\n'
    );
    
    // Add method if not exists
    if (!code.includes('async setupTimeSync()')) {
      const classEndRegex = /\n\}\n\nmodule\.exports/;
      code = code.replace(classEndRegex, TIME_SYNC_CODE + '\n}\n\nmodule.exports');
    }
    
    fs.writeFileSync(deviceFile, code);
    universalAdded++;
    
  } catch (e) {
    // Skip errors
  }
});

console.log(`✅ Universal time sync added to ${universalAdded} drivers\n`);

// ═══════════════════════════════════════════════════════════════════
// CREATE DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════

const timeDoc = `# ⏰ TIME SYNCHRONIZATION - TUYA ZIGBEE DEVICES

## Overview
Tuya Zigbee devices require time synchronization for proper operation, especially:
- Thermostats
- Climate sensors
- Scheduled devices
- Devices with logs/history

## Technical Details

### Zigbee Time Cluster (0x000A)
- **Attribute 0x0000**: time (uint32) - Seconds since 2000-01-01 00:00:00 UTC
- **Attribute 0x0001**: timeStatus (bitmap8) - Master/Synchronized status

### Implementation
\`\`\`javascript
// Calculate Zigbee epoch time
const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
const currentTime = Date.now();
const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);

// Write to device
await this.zclNode.endpoints[1].clusters.time.writeAttributes({
  time: zigbeeTime,
  timeStatus: {
    master: true,
    synchronized: true
  }
});
\`\`\`

### Periodic Sync
Time is re-synchronized every 24 hours to prevent drift.

## Affected Drivers
${needsTimeSync.length} critical drivers + ${universalAdded} universal implementation

## Benefits
✅ Accurate scheduling
✅ Proper timestamps in logs
✅ Thermostat programs work correctly
✅ Energy tracking accurate
✅ Device stability improved

## Non-Critical
Time sync failures are non-blocking. Devices will still function if time cluster not supported.

---
*Implemented: ${new Date().toISOString()}*
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'TIME_SYNC_IMPLEMENTATION.md'),
  timeDoc
);

console.log('═'.repeat(80));
console.log('\n✅ COMPLETE!\n');
console.log(`📊 Summary:`);
console.log(`   - Drivers analyzed:       ${drivers.length}`);
console.log(`   - Critical time sync:     ${implemented}`);
console.log(`   - Universal time sync:    ${universalAdded}`);
console.log(`   - Errors:                 ${errors}`);
console.log(`\n📄 Documentation: TIME_SYNC_IMPLEMENTATION.md\n`);
