'use strict';

/**
 * FIX FLOW WARNINGS DUPLICATION
 * 
 * Résout le problème des "Run listener was already registered"
 */

const fs = require('fs').promises;
const path = require('path');

const PROBLEMATIC_CARDS = [
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

async function fixFlowWarnings() {
  console.log('🔧 FIXING FLOW CARD DUPLICATION WARNINGS\n');
  
  const rootDir = path.join(__dirname, '..');
  const appJsPath = path.join(rootDir, 'app.js');
  
  try {
    let content = await fs.readFile(appJsPath, 'utf8');
    
    // Add guard flag at class level
    if (!content.includes('this._flowCardsRegistered')) {
      content = String(content).replace(
        /(class\s+\w+\s+extends\s+Homey\.App\s*{)/,
        '$1\n  _flowCardsRegistered = false;\n'
      );
    }
    
    // Wrap flow card registrations with guard
    const guardPattern = /if\s*\(\s*this\._flowCardsRegistered\s*\)/;
    
    if (!guardPattern.test(content)) {
      // Find onInit method and add guard
      content = String(content).replace(
        /(async\s+onInit\s*\(\s*\)\s*{)/,
        '$1\n    if (this._flowCardsRegistered) {\n      this.log(\'⏭️  Flow cards already registered\');\n      return;\n    }\n'
      );
      
      // Add flag set at end of onInit
      content = String(content).replace(
        /(async\s+onInit\s*\(\s*\)\s*{[^}]+)(}\s*$)/m,
        '$1    this._flowCardsRegistered = true;\n  $2'
      );
    }
    
    await fs.writeFile(appJsPath, content, 'utf8');
    console.log('✅ Added flow card registration guard to app.js');
    
    // Remove flow card registrations from drivers
    const driversDir = path.join(rootDir, 'drivers');
    const drivers = await fs.readdir(driversDir);
    let cleaned = 0;
    
    for (const driver of drivers) {
      const deviceJsPath = path.join(driversDir, driver, 'device.js');
      
      try {
        let deviceContent = await fs.readFile(deviceJsPath, 'utf8');
        const originalLength = deviceContent.length;
        
        // Remove flow card registration code
        deviceContent = String(deviceContent).replace(/\/\/\s*Register flow cards[\s\S]*?registerRunListener[\s\S]*?}\s*\);?/g, '');
        deviceContent = String(deviceContent).replace(/this\.homey\.flow\.get\w+Card\(['"][^'"]+['"]\)\.registerRunListener[\s\S]*?}\s*\);?/g, '');
        
        if (deviceContent.length !== originalLength) {
          await fs.writeFile(deviceJsPath, deviceContent, 'utf8');
          cleaned++;
        }
      } catch (err) {
        // File doesn't exist or can't be read
      }
    }
    
    console.log(`✅ Cleaned ${cleaned} driver files\n`);
    console.log('✅ FLOW WARNINGS FIX COMPLETE!\n');
    
  } catch (err) {
    console.error('❌ Error:', err);
    throw err;
  }
}

fixFlowWarnings().catch(console.error);
