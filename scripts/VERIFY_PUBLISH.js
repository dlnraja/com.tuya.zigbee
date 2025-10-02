#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 VERIFY & PUBLISH - Vérification et publication\n');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Catégories par type
const CATEGORIES = {
  light: ['smart_bulb', 'dimmer', 'led'],
  sensor: ['motion', 'door', 'temperature', 'humidity', 'smoke', 'co_detector', 'leak'],
  socket: ['socket', 'plug', 'switch'],
  climate: ['thermostat'],
  windowcoverings: ['curtain', 'blind']
};

let fixed = 0;

app.drivers.forEach(d => {
  // Fix category
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => d.id.includes(k))) {
      if (d.class !== cat) {
        console.log(`✅ ${d.id}: ${d.class || 'none'} → ${cat}`);
        d.class = cat;
        fixed++;
      }
      break;
    }
  }
  
  // Add platforms
  if (!d.platforms) {
    d.platforms = ['local'];
  }
});

console.log(`\n📊 ${fixed} drivers corrigés\n`);

// Save
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
console.log('💾 Sauvegardé\n');

// Validate
execSync('homey app validate', { stdio: 'inherit' });

// Commit & Push
execSync('git add .', { stdio: 'inherit' });
execSync('git commit -m "🔧 Drivers verified and enriched"', { stdio: 'inherit' });
execSync('git push origin master', { stdio: 'inherit' });

console.log('\n🎉 PRÊT! Exécutez: homey app publish');
