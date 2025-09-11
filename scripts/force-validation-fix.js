#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function forceValidationFix() {
  console.log('🚨 FORCE VALIDATION FIX - Applying aggressive fixes...\n');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  let content = await fs.readFile(appJsonPath, 'utf8');
  
  // Force replace the problematic bindings patterns
  console.log('🔍 Searching for problematic bindings...');
  
  // Pattern 1: Complex binding objects for sensors-TS0601_motion
  const complexBindingPattern = /"bindings": \[\s*{\s*"type": "report",[\s\S]*?"minChange": 1\s*}\s*\]/g;
  if (content.match(complexBindingPattern)) {
    content = content.replace(complexBindingPattern, '"bindings": [1026, 1]');
    console.log('✅ Replaced complex bindings with simple numeric array');
  }
  
  // Pattern 2: Missing endpoints for tuya driver
  const tuyaDriverPattern = /"id": "tuya",[\s\S]*?"zigbee": \{[\s\S]*?"productId": \[\s*"GENERIC"\s*\]\s*\}/g;
  const tuyaMatch = content.match(tuyaDriverPattern);
  if (tuyaMatch) {
    const tuyaSection = tuyaMatch[0];
    if (!tuyaSection.includes('"endpoints"')) {
      const fixedTuyaSection = tuyaSection.replace(
        /"productId": \[\s*"GENERIC"\s*\]\s*\}/,
        '"productId": [\n          "GENERIC"\n        ],\n        "endpoints": {\n          "1": {\n            "clusters": [0, 6],\n            "bindings": [6]\n          }\n        }\n      }'
      );
      content = content.replace(tuyaSection, fixedTuyaSection);
      console.log('✅ Added endpoints to tuya driver');
    }
  }
  
  // Direct string replacements for any remaining issues
  const replacements = [
    {
      search: /("bindings": \[)[^\]]*("type": "report")[^\]]*(\])/g,
      replace: '$1 1026, 1 $3'
    },
    {
      search: /"bindings": \[\s*\{\s*"type":\s*"report"[\s\S]*?\}\s*\]/g,
      replace: '"bindings": [1026, 1]'
    }
  ];
  
  for (const replacement of replacements) {
    if (content.match(replacement.search)) {
      content = content.replace(replacement.search, replacement.replace);
      console.log('✅ Applied direct string replacement');
    }
  }
  
  // Write the file
  await fs.writeFile(appJsonPath, content);
  console.log('📝 Force-saved app.json with validation fixes\n');
  
  // Verify the changes
  const verification = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(verification);
  
  let issuesFound = 0;
  for (const driver of appJson.drivers) {
    if (driver.id === 'sensors-TS0601_motion') {
      if (driver.zigbee?.endpoints?.['1']?.bindings) {
        const bindings = driver.zigbee.endpoints['1'].bindings;
        if (Array.isArray(bindings) && typeof bindings[0] === 'number') {
          console.log('✅ sensors-TS0601_motion bindings are numeric');
        } else {
          console.log('❌ sensors-TS0601_motion bindings still problematic:', bindings);
          issuesFound++;
        }
      }
    }
    
    if (driver.id === 'tuya') {
      if (driver.zigbee?.endpoints) {
        console.log('✅ tuya driver has endpoints');
      } else {
        console.log('❌ tuya driver still missing endpoints');
        issuesFound++;
      }
    }
  }
  
  if (issuesFound === 0) {
    console.log('🎉 All validation issues should be resolved!');
  } else {
    console.log(`⚠️ ${issuesFound} issues may remain`);
  }
}

if (require.main === module) {
  forceValidationFix()
    .then(() => console.log('🚀 Force validation fix completed'))
    .catch(console.error);
}

module.exports = { forceValidationFix };
