#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🧹 CLEANUP ASSETS - Remove all unnecessary files\n');

const ROOT = __dirname;
const assetsPath = path.join(ROOT, 'assets');
const assetsImagesPath = path.join(assetsPath, 'images');

// Fichiers à supprimer dans /assets/ (racine)
const rootFilesToDelete = [
  'xlarge.png'  // Déjà supprimé mais on vérifie
];

// Fichiers à supprimer dans /assets/images/
const imageFilesToDelete = [
  '.force-update',
  'icon-large-pro.svg',
  'icon-large.svg',
  'icon-small-pro.svg',
  'icon-small.svg',
  'icon-xlarge-pro.svg',
  'icon-xlarge.svg',
  'icon.svg'
];

let deleted = 0;

console.log('📂 Cleaning /assets/ root...');
rootFilesToDelete.forEach(file => {
  const filePath = path.join(assetsPath, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  ✅ Deleted: ${file}`);
    deleted++;
  }
});

console.log('\n📂 Cleaning /assets/images/...');
imageFilesToDelete.forEach(file => {
  const filePath = path.join(assetsImagesPath, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  ✅ Deleted: ${file}`);
    deleted++;
  }
});

console.log(`\n✅ Total: ${deleted} files deleted`);

console.log('\n📋 STRUCTURE FINALE:');
console.log('   /assets/');
console.log('     ├── icon.svg           (APP icon - REQUIS)');
console.log('     ├── temp_alarm.svg     (Custom capability)');
console.log('     ├── README.md          (Documentation)');
console.log('     ├── icons/             (Custom icons)');
console.log('     ├── templates/         (Templates)');
console.log('     └── images/');
console.log('         ├── large.png      (APP image - 500x350)');
console.log('         ├── small.png      (APP image - 250x175)');
console.log('         └── xlarge.png     (APP image - 1000x700)');
console.log('\n   /drivers/*/assets/images/');
console.log('     ├── small.png          (DRIVER image - 75x75)');
console.log('     └── large.png          (DRIVER image - 500x500)');
console.log('\n✅ Structure conforme SDK3 Homey!\n');

// Cleanup
fs.unlinkSync(__filename);
