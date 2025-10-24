#!/usr/bin/env node
/**
 * 🔧 FIX LIB PATHS IN DEVICE FILES
 * 
 * Corrige les paths incorrects vers lib/
 * De: require('../lib/...') 
 * Vers: require('../../lib/...')
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIX LIB PATHS\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(name => {
  const fullPath = path.join(DRIVERS_DIR, name);
  return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
});

let fixed = 0;

for (const driver of drivers) {
  const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
  
  if (!fs.existsSync(devicePath)) continue;
  
  let content = fs.readFileSync(devicePath, 'utf8');
  
  // Fix incorrect lib paths
  if (content.includes("require('../lib/")) {
    content = content.replace(/require\('\.\.\/lib\//g, "require('../../lib/");
    fs.writeFileSync(devicePath, content, 'utf8');
    console.log(`  ✅ ${driver}`);
    fixed++;
  }
}

console.log(`\n✅ ${fixed} drivers fixed\n`);
