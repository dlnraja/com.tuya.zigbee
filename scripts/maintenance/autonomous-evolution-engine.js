#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INTEL_REPORT = path.join(ROOT, 'REPORTS', 'INTELLECTUAL-ENRICHMENT.md');
const CHALLENGE_REPORT = path.join(ROOT, 'docs/reports/OPUS_4.6_CHALLENGE_REPORT.json');

async function main() {
  console.log('🌱  AUTONOMOUS EVOLUTION ENGINE - ACTIVATED');
  console.log('==========================================');

  // 1. Resolve Strict Architectural Violations
  if (fs.existsSync(CHALLENGE_REPORT)) {
    console.log('  → Processing Architectural Challenge findings...');
    const challenge = JSON.parse(fs.readFileSync(CHALLENGE_REPORT, 'utf8'));
    
    for (const v of challenge.violations) {
      if (v.violation === 'UNLINKED_GANG_FLOW') {
         // This is handled by master-flow-patcher.js
         // We ensures it runs as part of the loop.
      }
      
      if (v.violation === 'NON_HYBRID_RADAR') {
         console.log(`    ⚠️  Evolving driver ${v.driver} to Hybrid architecture...`);
         evolveToHybrid(v.driver);
      }
    }
  }

  // 2. Process Intellectual Harvest (Hidden Gems)
  if (fs.existsSync(INTEL_REPORT)) {
    console.log('  → Ingesting Intellectual Harvest gems...');
    // Logic to parse MD gems and apply them (e.g. adding missing manufacturers)
    // For now, we cross-check the 'latest-harvest.json'
    const latestHarvest = path.join(ROOT, 'data', 'intel-harvest', 'latest-harvest.json');
    if (fs.existsSync(latestHarvest)) {
       const harvest = JSON.parse(fs.readFileSync(latestHarvest, 'utf8'));
       for (const gem of harvest.hiddenGems) {
         if (gem.source === 'community_diag' && gem.inferredCategory !== 'unknown') {
            applyCommunityFingerprint(gem.fp, gem.inferredCategory);
         }
       }
    }
  }

  console.log('\n✨ Evolution cycle complete.');
}

function evolveToHybrid(driverId) {
  const devicePath = path.join(ROOT, 'drivers', driverId, 'device.js');
  if (!fs.existsSync(devicePath)) return;
  
  let content = fs.readFileSync(devicePath, 'utf8');
  if (content.includes('BaseHybridDevice') || content.includes('Hybrid')) return;

  // Evolution logic: Replace ZigBeeDevice with BaseHybridDevice
  content = content.replace("const { ZigBeeDevice } = require('homey-zigbeedriver');", "const { ZigBeeDevice } = require('homey-zigbeedriver');\nconst BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');");
  content = content.replace(/class (\w+) extends ZigBeeDevice/, "class $1 extends BaseHybridDevice");
  
  fs.writeFileSync(devicePath, content);
  console.log(`    ✅ ${driverId}: Evolved to BaseHybridDevice inheritance.`);
}

function applyCommunityFingerprint(fp, category) {
  // Mapping categories to driver IDs
  const catToDrv = {
    'curtain': 'curtain_motor',
    'switch': 'switch_1gang',
    'plug': 'plug_smart',
    'sensor_climate': 'climate_sensor',
    'sensor_motion': 'motion_sensor'
  };
  
  const drvId = catToDrv[category];
  if (!drvId) return;
  
  const composePath = path.join(ROOT, 'drivers', drvId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee.manufacturerName.includes(fp)) {
    compose.zigbee.manufacturerName.push(fp);
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    console.log(`    ✅ Added community gem ${fp} to ${drvId}`);
  }
}

main().catch(console.error);
