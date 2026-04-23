#!/usr/bin/env node
'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

/**
 * NEXUS AWAKENING RESTORATION PATCH
 * Focus: Correcting defects identified in forum reports and advanced audits.
 */
async function main() {
  console.log('  NEXUS AWAKENING RESTORATION PATCH - STARTING');
  console.log('==========================================');

  // 1. Fix Contact Sensor missing manufacturer (Issue #9)
  patchContactSensor();

  // 2. Fix 4-Gang Wireless Button Physical Logic (Issue #23)
  patchButton4Gang();

  // 3. Fix Radar mmWave periodic illuminance (Issue #37)
  patchRadarIlluminance();

  console.log('\n All restoration patches applied.');
}

function patchContactSensor() {
  const file = path.join(ROOT, 'drivers/contact_sensor/driver.compose.json');
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const mfr = "_TZ3000_n2egfsli";
  if (!data.zigbee.manufacturerName.includes(mfr)) {
    data.zigbee.manufacturerName.push(mfr);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(' Contact Sensor: Added _TZ3000_n2egfsli');
  }
}

function patchButton4Gang() {
  const file = path.join(ROOT, 'drivers/button_wireless_4/device.js');
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Inject Scene ID mapping fix for compressed endpoint devices
  // This maps Scene 10,11,12... to buttons 2,3,4 etc.
  const mappingFix = `
          // v5.12.5: Compressed Scene ID Mapping fix (Forum Issue #23)
          // Some devices send all buttons on EP1 with IDs: 1,2,3... or 10,11,12...
          const handleSceneRecall = async (sceneId) => {
            let button = ep;
            let actualScene = sceneId;
            
            if (sceneId >= 10 && ep === 1) {
              button = Math.floor(sceneId * 10) + 1;
              actualScene = sceneId % 10;
              this.log(\`[BUTTON4-SCENE]  Compressed Mapping: scene \${sceneId} -> button \${button}, action \${actualScene}\`);
            } else if (sceneId > 1 && ep === 1 && sceneId <= 4) {
              // Some use 1=Btn1, 2=Btn2...
              button = sceneId;
              actualScene = 0; // Single press
              this.log(\`[BUTTON4-SCENE]  Linear Mapping: scene \${sceneId} -> button \${button}\`);
            }

            const pressType = resolvePressType(actualScene, 'BTN4-scene');
            this.log(\`[BUTTON4-SCENE]  Physical Button \${button} \${pressType.toUpperCase()} (scene \${sceneId})\`);
            await this.triggerButtonPress(button, pressType);
          };`;

  if (!content.includes('Compressed Mapping')) {
    content = content.replace(/const handleSceneRecall = async \(sceneId\) => \{[\s\S]*?\} ;/, mappingFix);
    fs.writeFileSync(file, content);
    console.log(' Button 4-Gang: Implemented compressed scene mapping.');
  }
}

function patchRadarIlluminance() {
  const file = path.join(ROOT, 'drivers/motion_sensor_radar_mmwave/device.js');
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Inject configureReporting for illuminanceMeasurement
  const reportingLogic = `
    // v5.12.5: Continuous Illuminance Reporting (Forum Issue #37)
    try {
      const illum = zclNode.endpoints[1]?.clusters?.illuminanceMeasurement      ;
      if (illum) {
        await illum.configureReporting({
          measuredValue: { minInterval: 60, maxInterval: 900, minChange: 10 }
        }).catch(e => this.log('[ILLUM] config failed:', e.message));
        this.log('[ILLUM]  Periodic reporting configured');
      }
    } catch (e) { }
`;

  if (!content.includes('Continuous Illuminance Reporting') && content.includes('onNodeInit')) {
    content = content.replace('await super.onNodeInit({ zclNode });', `await super.onNodeInit({ zclNode });${reportingLogic}`);
    fs.writeFileSync(file, content);
    console.log(' Radar mmWave: Configured periodic illuminance reporting.');
  }
}

main().catch(console.error);
