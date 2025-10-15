#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * SIMPLE FLOW ENRICHMENT
 * Version simplifiée qui fonctionne à coup sûr
 */

// Template simple pour méthodes flow
const FLOW_METHODS_TEMPLATE = `
  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

  /**
   * Trigger flow with context data
   */
  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens);
      this.log(\`✅ Flow triggered: \${cardId}\`, tokens);
    } catch (err) {
      this.error(\`❌ Flow trigger error: \${cardId}\`, err);
    }
  }

  /**
   * Check if any alarm is active
   */
  async checkAnyAlarm() {
    const capabilities = this.getCapabilities();
    for (const cap of capabilities) {
      if (cap.startsWith('alarm_')) {
        const value = this.getCapabilityValue(cap);
        if (value === true) return true;
      }
    }
    return false;
  }

  /**
   * Get current context data
   */
  getContextData() {
    const context = {
      time_of_day: this.getTimeOfDay(),
      timestamp: new Date().toISOString()
    };
    
    // Add available sensor values
    const caps = this.getCapabilities();
    if (caps.includes('measure_luminance')) {
      context.luminance = this.getCapabilityValue('measure_luminance') || 0;
    }
    if (caps.includes('measure_temperature')) {
      context.temperature = this.getCapabilityValue('measure_temperature') || 0;
    }
    if (caps.includes('measure_humidity')) {
      context.humidity = this.getCapabilityValue('measure_humidity') || 0;
    }
    if (caps.includes('measure_battery')) {
      context.battery = this.getCapabilityValue('measure_battery') || 0;
    }
    
    return context;
  }

  /**
   * Get time of day
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
`;

const DRIVER_REGISTRATION_TEMPLATE = `
    // ========================================
    // FLOW CARD REGISTRATION - Auto-generated
    // ========================================
    
    // Register condition cards (if any exist in app.json)
    try {
      // Safety conditions
      if (this.homey.flow.getConditionCard) {
        const conditionCards = [
          'any_safety_alarm_active',
          'is_armed',
          'anyone_home',
          'room_occupied',
          'air_quality_good',
          'climate_optimal',
          'all_entries_secured',
          'is_consuming_power',
          'natural_light_sufficient'
        ];
        
        conditionCards.forEach(cardId => {
          try {
            this.homey.flow.getConditionCard(cardId)
              .registerRunListener(async (args) => {
                return args.device.checkAnyAlarm ? args.device.checkAnyAlarm() : false;
              });
          } catch (err) {
            // Card doesn't exist, skip
          }
        });
      }
      
      this.log('✅ Flow cards registered');
    } catch (err) {
      this.error('⚠️ Flow registration error:', err);
    }
`;

async function enrichDriverWithFlows(driverPath) {
  try {
    // 1. Add methods to device.js
    const devicePath = path.join(driverPath, 'device.js');
    let deviceCode = await fs.readFile(devicePath, 'utf8');
    
    // Check if already enriched
    if (deviceCode.includes('FLOW METHODS - Auto-generated')) {
      return { skipped: true, reason: 'Already enriched' };
    }
    
    // Find insertion point (before last closing brace)
    const lastBraceIndex = deviceCode.lastIndexOf('}');
    const beforeClosing = deviceCode.lastIndexOf('}', lastBraceIndex - 1);
    
    // Insert methods
    deviceCode = deviceCode.substring(0, beforeClosing + 1) + 
                 FLOW_METHODS_TEMPLATE + 
                 deviceCode.substring(beforeClosing + 1);
    
    await fs.writeFile(devicePath, deviceCode);
    
    // 2. Add registration to driver.js
    const driverJsPath = path.join(driverPath, 'driver.js');
    let driverCode = await fs.readFile(driverJsPath, 'utf8');
    
    if (!driverCode.includes('FLOW CARD REGISTRATION')) {
      // Find onInit
      const onInitMatch = driverCode.match(/async onInit\(\) \{/);
      if (onInitMatch) {
        const insertPos = driverCode.indexOf(onInitMatch[0]) + onInitMatch[0].length;
        driverCode = driverCode.substring(0, insertPos) + 
                     DRIVER_REGISTRATION_TEMPLATE +
                     driverCode.substring(insertPos);
        
        await fs.writeFile(driverJsPath, driverCode);
      }
    }
    
    return { success: true };
    
  } catch (err) {
    return { error: true, message: err.message };
  }
}

async function main() {
  console.log('🚀 SIMPLE FLOW ENRICHMENT\n');
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const folders = await fs.readdir(driversDir);
  
  const results = { success: 0, skipped: 0, errors: 0 };
  
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    process.stdout.write(`\r[${i+1}/${folders.length}] ${folder}...`);
    
    const driverPath = path.join(driversDir, folder);
    const stats = await fs.stat(driverPath);
    
    if (stats.isDirectory()) {
      const result = await enrichDriverWithFlows(driverPath);
      
      if (result.success) results.success++;
      else if (result.skipped) results.skipped++;
      else if (result.error) results.errors++;
    }
  }
  
  console.log('\n\n✅ ENRICHMENT COMPLETE!\n');
  console.log(`Success: ${results.success} drivers`);
  console.log(`Skipped: ${results.skipped} drivers`);
  console.log(`Errors: ${results.errors} drivers`);
}

main().catch(console.error);
