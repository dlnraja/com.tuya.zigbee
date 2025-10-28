#!/usr/bin/env node
'use strict';

/**
 * DIAGNOSTIC - État actuel des devices
 * 
 * Vérifie:
 * - Version app installée
 * - Capabilities par device
 * - Valeurs des capabilities
 * - Endpoints détectés
 */

const Homey = require('homey');

async function diagnose() {
  console.log('🔍 DIAGNOSTIC - État Actuel des Devices\n');
  console.log('═'.repeat(80));
  
  try {
    const app = new Homey.App();
    
    // Get app version
    const manifest = require('../app.json');
    console.log(`📦 App Version: ${manifest.version}`);
    console.log(`📦 App ID: ${manifest.id}\n`);
    
    // Get all devices
    const driver = app.homey.drivers.getDriver('switch_basic_2gang');
    const devices = driver.getDevices();
    
    console.log(`📱 Devices Found: ${devices.length}\n`);
    
    for (const device of devices) {
      console.log('═'.repeat(80));
      console.log(`📱 DEVICE: ${device.getName()}`);
      console.log(`   ID: ${device.getData().id}`);
      console.log(`   Driver: ${device.driver.id}`);
      console.log(`   Available: ${device.getAvailable()}`);
      console.log('');
      
      // Capabilities
      const capabilities = device.getCapabilities();
      console.log(`   📊 CAPABILITIES (${capabilities.length}):`);
      
      for (const cap of capabilities) {
        const value = device.getCapabilityValue(cap);
        const options = device.getCapabilityOptions(cap);
        
        console.log(`      - ${cap}:`);
        console.log(`        Value: ${value}`);
        if (options.title) {
          console.log(`        Title: ${options.title}`);
        }
        if (options.units) {
          console.log(`        Units: ${options.units}`);
        }
      }
      
      console.log('');
      
      // Store values
      const storeKeys = device.getStoreKeys();
      console.log(`   🗄️  STORE VALUES (${storeKeys.length}):`);
      for (const key of storeKeys) {
        const value = device.getStoreValue(key);
        console.log(`      - ${key}: ${JSON.stringify(value)}`);
      }
      
      console.log('');
      
      // Settings
      const settings = device.getSettings();
      console.log(`   ⚙️  SETTINGS:`);
      console.log(`      ${JSON.stringify(settings, null, 6)}`);
      
      console.log('');
    }
    
    console.log('═'.repeat(80));
    console.log('✅ Diagnostic complete\n');
    
  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
    console.error(err.stack);
  }
}

// Run if called directly
if (require.main === module) {
  diagnose().catch(console.error);
}

module.exports = { diagnose };
