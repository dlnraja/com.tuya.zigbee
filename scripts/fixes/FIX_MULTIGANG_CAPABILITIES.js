#!/usr/bin/env node
'use strict';

/**
 * FIX MULTIGANG CAPABILITIES
 * 
 * PROBLÈME: Les drivers 2gang/3gang n'ont qu'1 capability au lieu de 2/3
 * 
 * SOLUTION:
 * - 1gang: onoff (1 capability)
 * - 2gang: onoff + onoff.button2 (2 capabilities)
 * - 3gang: onoff + onoff.button2 + onoff.button3 (3 capabilities)
 * 
 * S'applique à:
 * - switch_*_2gang / switch_*_3gang
 * - usb_outlet_2port / usb_outlet_3gang
 * - button_wireless_2 / button_wireless_3 / button_wireless_4
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFixed = 0;

console.log('🔧 Fixing Multigang Capabilities');
console.log('=================================\n');

/**
 * Detect gang count from driver ID
 */
function detectGangCount(driverId) {
  if (driverId.includes('2gang') || driverId.includes('2port') || driverId.includes('_2')) {
    return 2;
  }
  if (driverId.includes('3gang') || driverId.includes('_3')) {
    return 3;
  }
  if (driverId.includes('4gang') || driverId.includes('_4')) {
    return 4;
  }
  if (driverId.includes('6gang') || driverId.includes('_6')) {
    return 6;
  }
  if (driverId.includes('8gang') || driverId.includes('_8')) {
    return 8;
  }
  return 1;
}

/**
 * Generate capabilities for multi-gang device
 */
function generateCapabilities(gangCount, isUsb = false, isButton = false) {
  const capabilities = ['onoff'];
  
  for (let i = 2; i <= gangCount; i++) {
    if (isUsb) {
      capabilities.push(`onoff.usb${i}`);
    } else if (isButton) {
      // Buttons don't have onoff, they just have button capabilities
      // Skip for now, buttons are handled differently
      return null;
    } else {
      capabilities.push(`onoff.button${i}`);
    }
  }
  
  return capabilities;
}

/**
 * Generate capability options for multi-gang device
 */
function generateCapabilityOptions(gangCount, isUsb = false) {
  const options = {
    "onoff": {
      "title": {
        "en": isUsb ? "USB Port 1" : "Gang 1",
        "fr": isUsb ? "Port USB 1" : "Gang 1"
      }
    }
  };
  
  for (let i = 2; i <= gangCount; i++) {
    const capId = isUsb ? `onoff.usb${i}` : `onoff.button${i}`;
    options[capId] = {
      "title": {
        "en": isUsb ? `USB Port ${i}` : `Gang ${i}`,
        "fr": isUsb ? `Port USB ${i}` : `Gang ${i}`
      }
    };
  }
  
  return options;
}

/**
 * Fix driver compose.json
 */
function fixDriverCompose(driverPath, driverId, gangCount) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return false;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Skip if not a switch/usb device
    if (!driverId.includes('switch') && !driverId.includes('usb') && !driverId.includes('button')) {
      return false;
    }
    
    // Skip buttons (they have different structure)
    if (driverId.includes('button_wireless')) {
      return false;
    }
    
    const isUsb = driverId.includes('usb');
    
    // Check current capabilities
    const currentCaps = compose.capabilities || [];
    const onoffCaps = currentCaps.filter(c => c.startsWith('onoff'));
    
    // If already has correct number of capabilities, skip
    if (onoffCaps.length >= gangCount) {
      return false;
    }
    
    console.log(`\n📄 ${driverId}:`);
    console.log(`   Current capabilities: ${onoffCaps.length}, Expected: ${gangCount}`);
    
    // Generate correct capabilities
    const correctCapabilities = generateCapabilities(gangCount, isUsb);
    
    if (!correctCapabilities) {
      return false;
    }
    
    // Update capabilities (keep other capabilities like measure_battery)
    const nonOnoffCaps = currentCaps.filter(c => !c.startsWith('onoff'));
    compose.capabilities = [...correctCapabilities, ...nonOnoffCaps];
    
    // Update capability options
    const correctOptions = generateCapabilityOptions(gangCount, isUsb);
    compose.capabilitiesOptions = {
      ...correctOptions,
      ...(compose.capabilitiesOptions || {})
    };
    
    // Keep battery option if exists
    if (compose.capabilitiesOptions?.measure_battery) {
      // Already exists, keep it
    }
    
    // Write back
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    
    console.log(`   ✅ Fixed: ${onoffCaps.length} → ${gangCount} capabilities`);
    return true;
    
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  console.log('Scanning for multigang devices...\n');
  
  for (const driverId of drivers) {
    const gangCount = detectGangCount(driverId);
    
    if (gangCount > 1) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      if (fixDriverCompose(driverPath, driverId, gangCount)) {
        totalFixed++;
      }
    }
  }
  
  console.log('\n=================================');
  console.log('📊 Fix Summary');
  console.log('=================================\n');
  
  console.log(`Total fixed: ${totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ MULTIGANG CAPABILITIES FIXED');
    console.log('\nDevices now have correct number of controls:');
    console.log('- 2gang: Gang 1 + Gang 2 (2 controls)');
    console.log('- 3gang: Gang 1 + Gang 2 + Gang 3 (3 controls)');
    console.log('- USB 2port: Port 1 + Port 2 (2 controls)');
    console.log('\nUsers will now see all controls in Homey!\n');
    console.log('⚠️  IMPORTANT: Users must RE-PAIR devices to get new capabilities\n');
    console.log('Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO FIXES NEEDED\n');
    process.exit(0);
  }
}

// Run fix
main();
