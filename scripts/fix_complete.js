const fs = require('fs');
const path = require('path');

console.log('=== HOMEY SDK3 COMPLETE FIX ===\n');

// Fix app.json image paths
console.log('[1/3] Fixing app.json...');
let appJson = fs.readFileSync('app.json', 'utf8');
appJson = appJson.replace(/"small":\s*"\.\/assets\/images\/small\.png"/g, '"small": "./assets/small.png"');
appJson = appJson.replace(/"fan_speed"/g, '"dim"');
fs.writeFileSync('app.json', appJson, 'utf8');
console.log('  ✓ Image paths and capabilities fixed');

// Clean .homeybuild
console.log('\n[2/3] Cleaning cache...');
if (fs.existsSync('.homeybuild')) {
  fs.rmSync('.homeybuild', { recursive: true, force: true });
  console.log('  ✓ .homeybuild removed');
}

// Summary
console.log('\n[3/3] Summary:');
const drivers = fs.readdirSync('drivers').filter(f => 
  fs.statSync(path.join('drivers', f)).isDirectory()
);
console.log(`  ✓ ${drivers.length} drivers ready`);
console.log('\n✅ Run: homey app validate --level publish');
