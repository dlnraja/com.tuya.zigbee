#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function main() {
  console.log('  MASTER FLOW-LINKAGE PATCHER - NEXUS AWAKENING');
  console.log('==========================================');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

  for (const drvId of drivers) {
    if (!drvId.includes('switch') && !drvId.includes('gang')) continue;
    
    // Detect gang count from driver ID or manifest
    const gangMatch = drvId.match(/(\d+)gang/);
    if (!gangMatch) continue;
    
    const count = parseInt(gangMatch[1]);
    if (count < 2) continue;

    const composePath = path.join(DRIVERS_DIR, drvId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    compose.flow = compose.flow || { triggers: [] };
    compose.flow.triggers = compose.flow.triggers || [];

    let modified = false;

    // 1. Ensure Physical Toggles for Gangs 1 to N
    for (let g = 1; g <= count; g++) {
      for (const action of ['on', 'off']) {
        const flowId = `${drvId}_physical_gang${g}_${action}`;
        if (!compose.flow.triggers.find(t => t.id === flowId)) {
          compose.flow.triggers.push({
            id: flowId,
            title: {
              en: `Gang ${g} turned ${action} (physical)`,
              fr: `Gang ${g} allumÃ©${action === 'off' ? ' (Ã©teint )' : ''} (physique)`
            }
          });
          modified = true;
        }
      }
    }

    // 2. Ensure Scene Triggers for Gangs 1 to N
    for (let g = 1; g <= count; g++) {
      const sceneId = `${drvId}_gang${g}_scene`;
      if (!compose.flow.triggers.find(t => t.id === sceneId)) {
        compose.flow.triggers.push({
          id: sceneId,
          title: {
            en: `Gang ${g} scene trigger`,
            fr: `DÃ©clencheur de scÃ¨ne Gang ${g}`
          },
          args: [
            {
              name: 'action',
              type: 'dropdown',
              values: [
                { "id": "on", "label": { "en": "On", "fr": "On" } },
                { "id": "off", "label": { "en": "Off", "fr": "Off" } }
              ]
            }
          ]
        });
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log(` Patched ${drvId}: Added missing flow linkages for ${count} gangs.`);
    }
  }

  console.log('\n Flow linkage synchronization complete.');
}

main().catch(console.error);
