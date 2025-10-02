#!/usr/bin/env node
/**
 * ORGANIZE_SCRIPTS.js - Organisation scripts
 * Phase 4 du Script Ultime V25
 */

const fs = require('fs');
const path = require('path');

console.log('📁 ORGANIZE_SCRIPTS - Organisation propre');

if (!fs.existsSync('scripts')) fs.mkdirSync('scripts');

const rootFiles = fs.readdirSync('.');
let organized = 0;

// Fichiers à garder à la racine (essentiels Homey)
const keepAtRoot = [
  'app.js', 'app.json', 'package.json', 'package-lock.json',
  'README.md', '.gitignore', '.homeyignore', 'locales'
];

rootFiles.forEach(file => {
  if (file.match(/\.(js|json)$/) && !keepAtRoot.includes(file) && !file.startsWith('.')) {
    const isScript = file.includes('_') || file.toUpperCase() === file || file.includes('fix') || file.includes('analyze');
    
    if (isScript) {
      try {
        fs.renameSync(file, `scripts/${file}`);
        organized++;
      } catch(e) {}
    }
  }
});

console.log(`✅ ${organized} scripts organisés dans scripts/`);
console.log('✅ Fichiers essentiels gardés à la racine');
