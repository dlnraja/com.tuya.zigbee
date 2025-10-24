#!/usr/bin/env node

/**
 * PHASE 2: DUPLICATION DRIVERS MULTI-BATTERY
 * Duplique les drivers qui supportent plusieurs types de batterie
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const mappingPath = path.join(__dirname, 'MIGRATION_MAP_v4.json');

if (!fs.existsSync(mappingPath)) {
  console.error('❌ MIGRATION_MAP_v4.json not found! Run 01_analyze_and_map.js first');
  process.exit(1);
}

const { mapping } = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

console.log('\n📋 PHASE 2: DUPLICATION DRIVERS MULTI-BATTERY\n');

const toDuplicate = mapping.filter(m => m.action === 'duplicate');
console.log(`Drivers à dupliquer: ${toDuplicate.length}\n`);

let duplicated = 0;
let errors = 0;

// Grouper par oldId
const grouped = {};
toDuplicate.forEach(m => {
  if (!grouped[m.oldId]) grouped[m.oldId] = [];
  grouped[m.oldId].push(m);
});

for (const [oldId, variants] of Object.entries(grouped)) {
  console.log(`\n📦 ${oldId} → ${variants.length} variantes`);
  
  const sourcePath = path.join(driversDir, oldId);
  if (!fs.existsSync(sourcePath)) {
    console.error(`  ❌ Source not found: ${sourcePath}`);
    errors++;
    continue;
  }
  
  for (const variant of variants) {
    const targetPath = path.join(driversDir, variant.newId);
    
    try {
      // Copier dossier complet
      if (fs.existsSync(targetPath)) {
        console.log(`  ⏭️  Skip (exists): ${variant.newId}`);
        continue;
      }
      
      fs.mkdirSync(targetPath, { recursive: true });
      
      // Copier tous les fichiers
      const files = fs.readdirSync(sourcePath);
      for (const file of files) {
        const srcFile = path.join(sourcePath, file);
        const destFile = path.join(targetPath, file);
        
        if (fs.statSync(srcFile).isDirectory()) {
          // Copier récursivement (assets, etc.)
          copyRecursive(srcFile, destFile);
        } else {
          fs.copyFileSync(srcFile, destFile);
        }
      }
      
      // Mettre à jour driver.compose.json
      const composePath = path.join(targetPath, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Update ID
        driver.id = variant.newId;
        
        // Update name
        const oldName = driver.name?.en || oldId;
        driver.name = driver.name || {};
        driver.name.en = `${oldName} (${variant.battery})`;
        
        // Update energy.batteries (single battery)
        if (driver.energy) {
          driver.energy.batteries = [variant.battery];
        }
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
      }
      
      // Mettre à jour flow file si existe
      const flowPath = path.join(targetPath, 'driver.flow.compose.json');
      if (fs.existsSync(flowPath)) {
        let flowContent = fs.readFileSync(flowPath, 'utf8');
        
        // Replace driver_id dans filters
        flowContent = flowContent.replace(
          new RegExp(`driver_id=${oldId}`, 'g'),
          `driver_id=${variant.newId}`
        );
        
        // Replace IDs dans flow cards
        const flow = JSON.parse(flowContent);
        
        if (flow.triggers) {
          flow.triggers.forEach(trigger => {
            trigger.id = trigger.id.replace(oldId, variant.newId);
          });
        }
        
        if (flow.actions) {
          flow.actions.forEach(action => {
            action.id = action.id.replace(oldId, variant.newId);
          });
        }
        
        if (flow.conditions) {
          flow.conditions.forEach(condition => {
            condition.id = condition.id.replace(oldId, variant.newId);
          });
        }
        
        fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + '\n');
      }
      
      console.log(`  ✅ ${variant.newId} (${variant.battery})`);
      duplicated++;
      
    } catch (err) {
      console.error(`  ❌ Error duplicating ${variant.newId}:`, err.message);
      errors++;
    }
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyRecursive(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

console.log(`\n✅ PHASE 2 TERMINÉE`);
console.log(`Dupliqués: ${duplicated}`);
console.log(`Erreurs: ${errors}\n`);
console.log(`Prochaine étape: node scripts/migration/03_rename_drivers.js\n`);
