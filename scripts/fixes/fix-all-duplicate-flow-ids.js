const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Finding and fixing ALL duplicate flow card IDs...\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

// Collect all flow cards from all drivers
const flowCardRegistry = {
  triggers: {},
  conditions: {},
  actions: {}
};

console.log('📋 Step 1: Scanning all drivers for flow cards...');

for (const driverName of drivers) {
  const composeJsonPath = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    continue;
  }
  
  try {
    const content = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
    
    // Check each flow card type
    ['triggers', 'conditions', 'actions'].forEach(cardType => {
      if (content[cardType]) {
        content[cardType].forEach(card => {
          const cardId = card.id;
          if (!flowCardRegistry[cardType][cardId]) {
            flowCardRegistry[cardType][cardId] = [];
          }
          flowCardRegistry[cardType][cardId].push(driverName);
        });
      }
    });
  } catch (err) {
    // Skip invalid JSON
  }
}

// Find duplicates
const duplicates = {};

['triggers', 'conditions', 'actions'].forEach(cardType => {
  Object.entries(flowCardRegistry[cardType]).forEach(([cardId, driverList]) => {
    if (driverList.length > 1) {
      if (!duplicates[cardType]) duplicates[cardType] = {};
      duplicates[cardType][cardId] = driverList;
    }
  });
});

console.log(`\n🔍 Found duplicate flow card IDs:\n`);

let totalDuplicates = 0;
Object.entries(duplicates).forEach(([cardType, cards]) => {
  Object.entries(cards).forEach(([cardId, drivers]) => {
    console.log(`   ${cardType}.${cardId}: ${drivers.length} drivers`);
    totalDuplicates += drivers.length;
  });
});

if (totalDuplicates === 0) {
  console.log('✅ No duplicates found!');
  process.exit(0);
}

console.log(`\n🔧 Step 2: Fixing ${totalDuplicates} duplicate IDs...\n`);

let fixed = 0;
let errors = 0;

// Fix duplicates
Object.entries(duplicates).forEach(([cardType, cards]) => {
  Object.entries(cards).forEach(([cardId, driverList]) => {
    
    driverList.forEach(driverName => {
      const composeJsonPath = path.join(driversDir, driverName, 'driver.flow.compose.json');
      
      try {
        let content = fs.readFileSync(composeJsonPath, 'utf8');
        const newId = `${driverName}_${cardId}`;
        
        // Replace the ID (be precise to only replace in "id" field)
        const pattern = new RegExp(`("id":\\s*)"${cardId}"`, 'g');
        const modified = String(content).replace(pattern, `$1"${newId}"`);
        
        if (modified !== content) {
          fs.writeFileSync(composeJsonPath, modified, 'utf8');
          console.log(`✅ ${driverName}: ${cardId} → ${newId}`);
          fixed++;
        }
        
      } catch (err) {
        console.error(`❌ ${driverName}: ${err.message}`);
        errors++;
      }
    });
  });
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed} drivers`);
console.log(`   ❌ Errors: ${errors}`);

// Validate to confirm
console.log(`\n🔍 Running validation...`);
try {
  execSync('homey app validate --level publish', { stdio: 'inherit' });
  console.log('\n✅ VALIDATION PASSED!');
} catch (err) {
  console.log('\n⚠️  Validation still has issues, check output above');
}
