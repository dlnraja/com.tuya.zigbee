#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔨 REBUILDING app.json FROM SOURCE\n');

// Read base app.json from .homeycompose
const composeAppPath = path.join(__dirname, '..', '..', '.homeycompose', 'app.json');
const baseApp = JSON.parse(fs.readFileSync(composeAppPath, 'utf8'));

console.log('✅ Loaded base app.json from .homeycompose');
console.log(`   Version: ${baseApp.version}`);
console.log(`   ID: ${baseApp.id}`);

// Create stub app.json with base info
const stubApp = {
  ...baseApp,
  drivers: [],
  flow: {
    actions: [],
    triggers: [],
    conditions: []
  }
};

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
fs.writeFileSync(appJsonPath, JSON.stringify(stubApp, null, 2), 'utf8');

console.log('✅ Created stub app.json');

// Now run homey app build
console.log('\n🔄 Running homey app build...\n');

try {
  execSync('npx homey app build', {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit'
  });
  
  console.log('\n✅ Build completed successfully\n');
  
  // Verify the new app.json
  const newApp = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  console.log('📊 New app.json statistics:');
  console.log(`   Version: ${newApp.version}`);
  console.log(`   Drivers: ${newApp.drivers.length}`);
  console.log(`   Flow Actions: ${newApp.flow.actions.length}`);
  console.log(`   Flow Triggers: ${newApp.flow.triggers.length}`);
  console.log(`   Flow Conditions: ${newApp.flow.conditions.length}\n`);
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
