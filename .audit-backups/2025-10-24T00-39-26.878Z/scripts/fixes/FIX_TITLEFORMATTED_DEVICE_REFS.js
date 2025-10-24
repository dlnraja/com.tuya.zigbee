#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIXING [[device]] REFERENCES IN titleFormatted\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const driverFolders = fs.readdirSync(driversDir).filter(item => {
  return fs.statSync(path.join(driversDir, item)).isDirectory();
});

let totalFixed = 0;
let filesModified = 0;

for (const driverFolder of driverFolders) {
  const flowFilePath = path.join(driversDir, driverFolder, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowFilePath)) continue;
  
  try {
    const data = JSON.parse(fs.readFileSync(flowFilePath, 'utf8'));
    let fileModified = false;
    
    // Process all flow card types
    for (const cardType of ['actions', 'triggers', 'conditions']) {
      if (!data[cardType] || !Array.isArray(data[cardType])) continue;
      
      for (const card of data[cardType]) {
        if (!card.titleFormatted) continue;
        
        // Check if titleFormatted contains [[device]]
        for (const lang in card.titleFormatted) {
          const titleFormatted = card.titleFormatted[lang];
          
          if (titleFormatted && titleFormatted.includes('[[device]]')) {
            // Check if card actually has a device argument
            const hasDeviceArg = card.args && card.args.some(arg => arg.name === 'device');
            
            if (!hasDeviceArg) {
              // Remove [[device]] from titleFormatted
              const newTitle = titleFormatted.replace(/\[\[device\]\]\s*/g, '').trim();
              card.titleFormatted[lang] = newTitle;
              
              console.log(`  ✂️  ${driverFolder}/`);
              console.log(`     ${cardType}: ${card.id}`);
              console.log(`     Removed [[device]] from titleFormatted.${lang}\n`);
              
              fileModified = true;
              totalFixed++;
            }
          }
        }
      }
    }
    
    if (fileModified) {
      fs.writeFileSync(flowFilePath, JSON.stringify(data, null, 2), 'utf8');
      filesModified++;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${driverFolder}:`, error.message);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`✅ COMPLETED`);
console.log(`   Drivers checked: ${driverFolders.length}`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total titleFormatted fixed: ${totalFixed}`);
console.log(`${'='.repeat(70)}\n`);

process.exit(0);
