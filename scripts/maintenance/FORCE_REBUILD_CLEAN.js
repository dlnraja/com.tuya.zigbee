#!/usr/bin/env node

/**
 * FORCE REBUILD CLEAN
 * Nettoie TOUS les caches pour forcer rebuild complet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

console.log('🧹 FORCE REBUILD CLEAN\n');
console.log('='.repeat(70) + '\n');

const cacheDirs = [
  '.homeybuild',
  '.homeycompose',
  'node_modules/.cache',
  '.npm',
  '.cache'
];

let cleaned = 0;

cacheDirs.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${dir}`);
      cleaned++;
    } catch (err) {
      console.log(`⚠️  Could not remove ${dir}: ${err.message}`);
    }
  } else {
    console.log(`⏭️  Not found: ${dir}`);
  }
});

console.log(`\n📊 Cleaned ${cleaned} cache directories\n`);
console.log('✅ Ready for fresh rebuild!\n');
