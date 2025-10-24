#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 RENAMING FOLDERS WITH DOUBLE SUFFIXES\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

const renames = [];

for (const driver of drivers) {
  const fullPath = path.join(driversDir, driver);
  const stat = fs.statSync(fullPath);
  
  if (!stat.isDirectory()) continue;
  
  let newName = driver;
  let modified = false;
  
  // Fix ikea_ikea_ -> ikea_
  if (/^ikea_ikea_/.test(newName)) {
    newName = String(newName).replace(/^ikea_ikea_/, 'ikea_');
    modified = true;
  }
  
  // Fix _other_other$ -> _other
  if (/_other_other$/.test(newName)) {
    newName = String(newName).replace(/_other_other$/, '_other');
    modified = true;
  }
  
  // Fix _aaa_aaa$ -> _aaa
  if (/_aaa_aaa$/.test(newName)) {
    newName = String(newName).replace(/_aaa_aaa$/, '_aaa');
    modified = true;
  }
  
  // Fix _aa_aa$ -> _aa
  if (/_aa_aa$/.test(newName)) {
    newName = String(newName).replace(/_aa_aa$/, '_aa');
    modified = true;
  }
  
  // Fix _internal_internal$ -> _internal
  if (/_internal_internal$/.test(newName)) {
    newName = String(newName).replace(/_internal_internal$/, '_internal');
    modified = true;
  }
  
  if (modified) {
    renames.push({
      old: driver,
      new: newName,
      oldPath: fullPath,
      newPath: path.join(driversDir, newName)
    });
  }
}

console.log(`Found ${renames.length} folders to rename:\n`);

for (const rename of renames) {
  console.log(`  📁 ${rename.old}`);
  console.log(`  ➜  ${rename.new}\n`);
  
  try {
    fs.renameSync(rename.oldPath, rename.newPath);
    console.log(`     ✅ Renamed successfully\n`);
  } catch (error) {
    console.error(`     ❌ Error: ${error.message}\n`);
  }
}

console.log(`\n✅ Renamed ${renames.length} folders\n`);

// Now update app.json references
console.log('🔄 Updating app.json driver references...\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let updatedCount = 0;

if (appJson.drivers) {
  for (const driver of appJson.drivers) {
    const oldId = driver.id;
    let newId = oldId;
    
    // Apply same fixes to IDs
    if (/^ikea_ikea_/.test(newId)) {
      newId = String(newId).replace(/^ikea_ikea_/, 'ikea_');
    }
    if (/_other_other$/.test(newId)) {
      newId = String(newId).replace(/_other_other$/, '_other');
    }
    if (/_aaa_aaa$/.test(newId)) {
      newId = String(newId).replace(/_aaa_aaa$/, '_aaa');
    }
    if (/_aa_aa$/.test(newId)) {
      newId = String(newId).replace(/_aa_aa$/, '_aa');
    }
    if (/_internal_internal$/.test(newId)) {
      newId = String(newId).replace(/_internal_internal$/, '_internal');
    }
    
    if (oldId !== newId) {
      console.log(`  🔄 Driver ID: ${oldId} → ${newId}`);
      driver.id = newId;
      updatedCount++;
    }
  }
}

// Update flow card filters
if (appJson.flow) {
  for (const cardType of ['actions', 'triggers', 'conditions']) {
    if (!appJson.flow[cardType]) continue;
    
    for (const card of appJson.flow[cardType]) {
      if (!card.args) continue;
      
      for (const arg of card.args) {
        if (arg.name === 'device' && arg.filter && arg.filter.startsWith('driver_id=')) {
          const oldFilter = arg.filter;
          let newFilter = oldFilter;
          
          // Apply same fixes
          if (/ikea_ikea_/.test(newFilter)) {
            newFilter = String(newFilter).replace(/ikea_ikea_/g, 'ikea_');
          }
          if (/_other_other/.test(newFilter)) {
            newFilter = String(newFilter).replace(/_other_other/g, '_other');
          }
          if (/_aaa_aaa/.test(newFilter)) {
            newFilter = String(newFilter).replace(/_aaa_aaa/g, '_aaa');
          }
          if (/_aa_aa/.test(newFilter)) {
            newFilter = String(newFilter).replace(/_aa_aa/g, '_aa');
          }
          if (/_internal_internal/.test(newFilter)) {
            newFilter = String(newFilter).replace(/_internal_internal/g, '_internal');
          }
          
          if (oldFilter !== newFilter) {
            arg.filter = newFilter;
            updatedCount++;
          }
        }
      }
    }
  }
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Updated ${updatedCount} references in app.json\n`);
console.log('$'.repeat(70));
console.log('✅ ALL DOUBLE SUFFIXES FIXED');
console.log('$'.repeat(70) + '\n');

process.exit(0);
