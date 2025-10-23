#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🖼️  VÉRIFICATION DES IMAGES UNIQUES PAR DRIVER\n');
console.log('='.repeat(70));

// Load app.json
const appPath = path.join(__dirname, '../../app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

const imageHashes = new Map(); // hash -> [drivers using this image]
const stats = {
  totalDrivers: 0,
  driversWithUniqueImages: 0,
  driversWithSharedImages: 0,
  missingImages: []
};

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

app.drivers.forEach(driver => {
  stats.totalDrivers++;
  
  if (!driver.images?.small) return;
  
  const smallPath = driver.images.small.startsWith('/') 
    ? path.join(__dirname, '../..', driver.images.small.substring(1))
    : path.join(__dirname, '../..', driver.images.small);
  
  const hash = getFileHash(smallPath);
  
  if (!hash) {
    stats.missingImages.push(driver.id);
    return;
  }
  
  if (!imageHashes.has(hash)) {
    imageHashes.set(hash, []);
  }
  imageHashes.get(hash).push(driver.id);
});

// Analyze results
const sharedImages = [];
imageHashes.forEach((drivers, hash) => {
  if (drivers.length > 1) {
    sharedImages.push({ hash, drivers });
    drivers.forEach(d => stats.driversWithSharedImages++);
  } else {
    stats.driversWithUniqueImages++;
  }
});

console.log('\n📊 STATISTIQUES\n');
console.log(`Total drivers: ${stats.totalDrivers}`);
console.log(`Drivers avec images uniques: ${stats.driversWithUniqueImages}`);
console.log(`Drivers partageant des images: ${stats.driversWithSharedImages}`);
console.log(`Images manquantes: ${stats.missingImages.length}`);
console.log(`Groupes d'images partagées: ${sharedImages.length}`);

if (sharedImages.length > 0) {
  console.log('\n\n🔄 IMAGES PARTAGÉES PAR PLUSIEURS DRIVERS:\n');
  sharedImages.slice(0, 10).forEach((group, idx) => {
    console.log(`\nGroupe ${idx + 1} (${group.drivers.length} drivers):`);
    group.drivers.forEach(d => console.log(`  - ${d}`));
  });
  if (sharedImages.length > 10) {
    console.log(`\n... et ${sharedImages.length - 10} autres groupes`);
  }
}

if (stats.missingImages.length > 0) {
  console.log('\n\n❌ IMAGES MANQUANTES:\n');
  stats.missingImages.slice(0, 20).forEach(d => console.log(`  - ${d}`));
  if (stats.missingImages.length > 20) {
    console.log(`... et ${stats.missingImages.length - 20} autres`);
  }
}

console.log('\n' + '='.repeat(70));

if (stats.driversWithSharedImages === 0 && stats.missingImages.length === 0) {
  console.log('\n✅ PARFAIT! Tous les drivers ont des images uniques!\n');
} else {
  console.log('\n⚠️  Certains drivers partagent les mêmes images.\n');
  console.log('ℹ️  Cela peut être intentionnel pour des drivers similaires.\n');
}

console.log('='.repeat(70));
