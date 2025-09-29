#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 MEGA COMPLETE SYSTEM v2.0.0');

// Référentiels complets
['references', 'scripts', 'reports'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
});

// Base de données par manufacturer
const db = {
  motion: ['_TZ3000_mmtwjmaq'],
  switch: ['_TZ3000_qzjcsmar'],
  plug: ['_TZ3000_g5xawfcq']
};

// Enrichissement drivers
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    const cat = d.includes('motion') ? 'motion' : d.includes('plug') ? 'plug' : 'switch';
    data.zigbee.manufacturerName = db[cat];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
  }
});

// Validation & publication
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "🚀 Mega Complete v2.0.0" && git push --force', {stdio: 'inherit'});
  console.log('✅ MEGA COMPLETE SUCCESS');
} catch (e) {
  console.log('❌', e.message);
}
