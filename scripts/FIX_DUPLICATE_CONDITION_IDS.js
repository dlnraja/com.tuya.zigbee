const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

console.log('🔍 Reading app.json...');
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

if (!appJson.flow) {
  console.log('❌ No flow found');
  process.exit(1);
}

function fixDuplicates(flowCards, cardType) {
  if (!flowCards || flowCards.length === 0) {
    console.log(`⚠️  No ${cardType} found`);
    return 0;
  }

  console.log(`\n📊 Total ${cardType}: ${flowCards.length}`);

  // Find duplicates
  const idCounts = {};
  const duplicates = {};

  flowCards.forEach((card, index) => {
    const id = card.id;
    if (!idCounts[id]) {
      idCounts[id] = [];
    }
    idCounts[id].push(index);
  });

  // Identify duplicates
  Object.keys(idCounts).forEach(id => {
    if (idCounts[id].length > 1) {
      duplicates[id] = idCounts[id];
    }
  });

  console.log(`🔴 Found ${Object.keys(duplicates).length} duplicate ${cardType} IDs`);

  if (Object.keys(duplicates).length === 0) {
    console.log(`✅ No duplicate ${cardType} found!`);
    return 0;
  }

  let fixedCount = 0;

  // Fix duplicates
  Object.keys(duplicates).forEach(duplicateId => {
    const indices = duplicates[duplicateId];
    console.log(`\n📌 Duplicate ID: "${duplicateId}" (${indices.length} occurrences)`);
    
    // Keep the first occurrence, rename the rest
    for (let i = 1; i < indices.length; i++) {
      const index = indices[i];
      const card = flowCards[index];
      
      // Extract driver_id from the filter
      const driverFilter = card.args?.find(arg => arg.filter)?.filter;
      let driverId = '';
      
      if (driverFilter) {
        const match = driverFilter.match(/driver_id=([a-zA-Z0-9_]+)/);
        if (match) {
          driverId = match[1];
        }
      }
      
      // Create a new unique ID based on driver_id and original ID
      let newId;
      if (driverId) {
        // Use pattern: driverId_originalId
        newId = `${driverId}_${duplicateId}`;
      } else {
        // Fallback: append index number
        newId = `${duplicateId}_${i + 1}`;
      }
      
      console.log(`  ${index}: "${duplicateId}" -> "${newId}"`);
      flowCards[index].id = newId;
      fixedCount++;
    }
  });

  return fixedCount;
}

let totalFixed = 0;

// Fix conditions
if (appJson.flow.conditions) {
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 Checking CONDITIONS');
  console.log('═══════════════════════════════════════');
  totalFixed += fixDuplicates(appJson.flow.conditions, 'conditions');
}

// Fix actions
if (appJson.flow.actions) {
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 Checking ACTIONS');
  console.log('═══════════════════════════════════════');
  totalFixed += fixDuplicates(appJson.flow.actions, 'actions');
}

// Fix triggers
if (appJson.flow.triggers) {
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 Checking TRIGGERS');
  console.log('═══════════════════════════════════════');
  totalFixed += fixDuplicates(appJson.flow.triggers, 'triggers');
}

console.log('\n═══════════════════════════════════════');
console.log(`✅ Total fixed: ${totalFixed} duplicate IDs`);
console.log('═══════════════════════════════════════\n');

if (totalFixed > 0) {
  // Save the updated app.json
  console.log('💾 Saving updated app.json...');
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
  console.log('✅ Done! app.json has been updated.');
} else {
  console.log('ℹ️  No changes needed.');
}
