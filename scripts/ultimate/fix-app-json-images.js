const fs = require('fs');
const path = require('path');

console.log('🖼️  FIXING APP.JSON - Adding driver images paths\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

let fixed = 0;

for (const driver of app.drivers) {
  const driverId = driver.id;
  
  // Ajouter objet images avec chemins absolus depuis racine projet
  driver.images = {
    small: `/drivers/${driverId}/assets/images/small.png`,
    large: `/drivers/${driverId}/assets/images/large.png`,
    xlarge: `/drivers/${driverId}/assets/images/xlarge.png`
  };
  
  fixed++;
}

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n', 'utf8');

console.log(`✅ Fixed ${fixed} drivers in app.json`);
console.log('\n🔨 Now rebuild:');
console.log('   Remove-Item -Recurse -Force .homeybuild');
console.log('   homey app build');
console.log('   homey app validate --level publish');
console.log('\n🎉 Done!');
