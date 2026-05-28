#!/usr/bin/env node
/**
 * FIX LARGE IMAGES - Workaround for Homey CLI bug
 * 
 * The Homey CLI doesn't copy large.png files to .homeybuild
 * This script copies them manually after build
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const BUILD_DIR = path.join(ROOT, '.homeybuild', 'drivers');

// Only run if .homeybuild exists (after build)
if (!fs.existsSync(BUILD_DIR)) {
  console.log('⏭️  .homeybuild not found, skipping image fix');
  process.exit(0);
}

// ===== MINIFY app.json to pass Homey 7MB size limit =====
const APP_JSON_PATH = path.join(ROOT, '.homeybuild', 'app.json');
if (fs.existsSync(APP_JSON_PATH)) {
  try {
    const raw = fs.readFileSync(APP_JSON_PATH, 'utf8');
    const minified = JSON.stringify(JSON.parse(raw));
    fs.writeFileSync(APP_JSON_PATH, minified, 'utf8');
    const saved = raw.length - minified.length;
    console.log(` — Minified app.json from ${(raw.length / 1048576).toFixed(2)} MB to ${(minified.length / 1048576).toFixed(2)} MB (saved ${(saved / 1048576).toFixed(2)} MB)`);
  } catch (e) {
    console.error(' — Failed to minify app.json:', e.message);
  }
} else {
  console.log(' — app.json not found in .homeybuild, skipping minification');
}

let copied = 0;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

for (const driver of drivers) {
  // Check both possible locations for large.png
  const sources = [
    path.join(DRIVERS_DIR, driver, 'assets', 'images', 'large.png'),
    path.join(DRIVERS_DIR, driver, 'assets', 'large.png')
  ];
  
  for (const src of sources) {
    if (fs.existsSync(src)) {
      const dstDir = path.join(BUILD_DIR, driver, 'assets', 'images');
      const dst = path.join(dstDir, 'large.png');
      
      // Create directory if needed
      if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(src, dst);
      copied++;
      break; // Found and copied, move to next driver
    }
  }
}

console.log(`✅ Copied ${copied} large.png files to .homeybuild`);
