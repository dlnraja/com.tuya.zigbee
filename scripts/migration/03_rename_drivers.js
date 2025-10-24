#!/usr/bin/env node

/**
 * PHASE 3: RENOMMAGE DRIVERS EXISTANTS
 * Renomme les drivers qui ne nécessitent pas de duplication
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const mappingPath = path.join(__dirname, 'MIGRATION_MAP_v4.json');

if (!fs.existsSync(mappingPath)) {
  console.error('❌ MIGRATION_MAP_v4.json not found!');
  process.exit(1);
}

const { mapping } = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

console.log('\n✏️  PHASE 3: RENOMMAGE DRIVERS\n');

const toRename = mapping.filter(m => m.action === 'rename');
console.log(`Drivers à renommer: ${toRename.length}\n`);

let renamed = 0;
let errors = 0;

for (const item of toRename) {
  const oldPath = path.join(driversDir, item.oldId);
  const newPath = path.join(driversDir, item.newId);
  
  try {
    if (!fs.existsSync(oldPath)) {
      console.log(`⏭️  Skip: ${item.oldId} (not found)`);
      continue;
    }
    
    if (fs.existsSync(newPath)) {
      console.log(`⏭️  Skip: ${item.newId} (already exists)`);
      continue;
    }
    
    // Renommer dossier
    fs.renameSync(oldPath, newPath);
    
    // Update driver.compose.json
    const composePath = path.join(newPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      driver.id = item.newId;
      
      // Update name avec marque et batterie
      const oldName = driver.name?.en || item.oldId;
      driver.name = driver.name || {};
      
      let newName = oldName;
      // Ajouter battery type si applicable
      if (item.battery && item.battery !== 'none') {
        if (!newName.includes(`(${item.battery})`)) {
          newName = String(newName).replace(/\((Battery|AC|DC|Hybrid)\)$/i, `(${item.battery})`);
          if (!newName.includes('(')) {
            newName += ` (${item.battery})`;
          }
        }
      }
      
      driver.name.en = newName;
      
      fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
    }
    
    // Update flow file
    const flowPath = path.join(newPath, 'driver.flow.compose.json');
    if (fs.existsSync(flowPath)) {
      let flowContent = fs.readFileSync(flowPath, 'utf8');
      
      // Replace driver_id
      flowContent = String(flowContent).replace(
        new RegExp(`driver_id=${item.oldId}`, 'g'),
        `driver_id=${item.newId}`
      );
      
      const flow = JSON.parse(flowContent);
      
      if (flow.triggers) {
        flow.triggers.forEach(trigger => {
          trigger.id = trigger.String(id).replace(item.oldId, item.newId);
        });
      }
      
      if (flow.actions) {
        flow.actions.forEach(action => {
          action.id = action.String(id).replace(item.oldId, item.newId);
        });
      }
      
      if (flow.conditions) {
        flow.conditions.forEach(condition => {
          condition.id = condition.String(id).replace(item.oldId, item.newId);
        });
      }
      
      fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + '\n');
    }
    
    console.log(`✅ ${item.oldId} → ${item.newId}`);
    renamed++;
    
  } catch (err) {
    console.error(`❌ Error renaming ${item.oldId}:`, err.message);
    errors++;
  }
}

console.log(`\n✅ PHASE 3 TERMINÉE`);
console.log(`Renommés: ${renamed}`);
console.log(`Erreurs: ${errors}\n`);
console.log(`Prochaine étape: node scripts/migration/04_update_references.js\n`);
