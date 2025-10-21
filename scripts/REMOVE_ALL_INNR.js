#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🗑️  REMOVING ALL INNR DRIVERS (INCOMPLETE)\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Remove Innr folders
const innrFolders = fs.readdirSync(driversDir)
  .filter(d => d.startsWith('innr_'))
  .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());

console.log(`Found ${innrFolders.length} Innr driver folders:`);
innrFolders.forEach(folder => {
  const fullPath = path.join(driversDir, folder);
  fs.rmSync(fullPath, { recursive: true, force: true });
  console.log(`  ❌ Deleted: ${folder}`);
});

// Remove from app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
const before = appJson.drivers.length;
appJson.drivers = appJson.drivers.filter(d => !d.id.startsWith('innr_'));
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`\n✅ Removed ${innrFolders.length} Innr driver folders`);
console.log(`✅ Cleaned app.json: ${before} → ${appJson.drivers.length} drivers\n`);
