#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');

try {
  const data = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  console.log('\n✅ app.json is VALID JSON\n');
  console.log(`📋 Version: ${data.version}`);
  console.log(`🔧 SDK: ${data.sdk}`);
  console.log(`🆔 ID: ${data.id}`);
  console.log(`🚗 Drivers: ${data.drivers.length}`);
  console.log(`⚡ Flow Actions: ${data.flow.actions.length}`);
  console.log(`🎯 Flow Triggers: ${data.flow.triggers.length}`);
  console.log(`❓ Flow Conditions: ${data.flow.conditions.length}`);
  
  // Check for common issues
  const issues = [];
  
  // Check version in .homeycompose
  const homeycomposeAppPath = path.join(__dirname, '..', '..', '.homeycompose', 'app.json');
  const homeycomposeData = JSON.parse(fs.readFileSync(homeycomposeAppPath, 'utf8'));
  
  if (data.version !== homeycomposeData.version) {
    issues.push(`❌ Version mismatch: app.json (${data.version}) != .homeycompose/app.json (${homeycomposeData.version})`);
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:\n');
    issues.forEach(issue => console.log(issue));
    process.exit(1);
  } else {
    console.log('\n✅ No issues found!\n');
    process.exit(0);
  }
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
}
