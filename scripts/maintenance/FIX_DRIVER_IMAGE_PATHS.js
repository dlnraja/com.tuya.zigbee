#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING DRIVER IMAGE PATHS IN APP.JSON\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let fixed = 0;
let errors = 0;

console.log(`📊 Total drivers: ${app.drivers.length}\n`);

app.drivers.forEach((driver, index) => {
  const driverId = driver.id;
  const current = driver.images;
  
  // Expected paths
  const expected = {
    small: `/drivers/${driverId}/assets/small.png`,
    large: `/drivers/${driverId}/assets/large.png`
  };
  
  // Check if paths are wrong
  const needsFix = 
    !current ||
    current.small !== expected.small ||
    current.large !== expected.large ||
    current.small === './assets/small.png' ||
    current.small === '/assets/small.png';
  
  if (needsFix) {
    console.log(`❌ ${driverId}`);
    console.log(`   Current: ${JSON.stringify(current)}`);
    console.log(`   Fixed:   ${JSON.stringify(expected)}`);
    
    // Fix it
    app.drivers[index].images = expected;
    fixed++;
  }
});

if (fixed > 0) {
  // Save app.json
  fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2), 'utf8');
  console.log(`\n✅ Fixed ${fixed} drivers!`);
  console.log(`📝 app.json updated`);
} else {
  console.log('\n✅ All driver image paths are correct!');
}

if (errors > 0) {
  console.log(`\n⚠️  ${errors} drivers had issues`);
}

console.log('\n🎉 DONE!');
