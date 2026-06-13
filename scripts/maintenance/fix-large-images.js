#!/usr/bin/env node
/**
 * POSTBUILD OPTIMIZATIONS
 *
 * 1. Minify app.json (removes whitespace, removes _comment field)
 * 2. Copy large.png files (Homey CLI bug workaround)
 * 3. Remove non-runtime files (JPGs, .map files)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BUILD_DIR = path.join(ROOT, '.homeybuild');

// Only run if .homeybuild exists (after build)
if (!fs.existsSync(BUILD_DIR)) {
  console.log('⏭️  .homeybuild not found, skipping postbuild');
  process.exit(0);
}

// ===== 1. MINIFY app.json + remove _comment =====
const APP_JSON_PATH = path.join(BUILD_DIR, 'app.json');
if (fs.existsSync(APP_JSON_PATH)) {
  try {
    const raw = fs.readFileSync(APP_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Remove _comment field (non-standard, may cause Athom server issues)
    if (parsed._comment) {
      delete parsed._comment;
      console.log(' — Removed _comment field from app.json');
    }
    const minified = JSON.stringify(parsed);
    fs.writeFileSync(APP_JSON_PATH, minified, 'utf8');
    const saved = raw.length - minified.length;
    console.log(` — Minified app.json from ${(raw.length / 1048576).toFixed(2)} MB to ${(minified.length / 1048576).toFixed(2)} MB (saved ${(saved / 1048576).toFixed(2)} MB)`);
  } catch (e) {
    console.error(' — Failed to minify app.json:', e.message);
  }
} else {
  console.log(' — app.json not found in .homeybuild, skipping minification');
}

// ===== 2. COPY large.png files =====
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DRIVERS_BUILD_DIR = path.join(BUILD_DIR, 'drivers');
let copied = 0;

if (fs.existsSync(DRIVERS_DIR)) {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  for (const driver of drivers) {
    const sources = [
      path.join(DRIVERS_DIR, driver, 'assets', 'images', 'large.png'),
      path.join(DRIVERS_DIR, driver, 'assets', 'large.png')
    ];

    for (const src of sources) {
      if (fs.existsSync(src)) {
        const dstDir = path.join(DRIVERS_BUILD_DIR, driver, 'assets', 'images');
        const dst = path.join(dstDir, 'large.png');

        if (!fs.existsSync(dstDir)) {
          fs.mkdirSync(dstDir, { recursive: true });
        }

        fs.copyFileSync(src, dst);
        copied++;
        break;
      }
    }
  }
}

console.log(` — Copied ${copied} large.png files to .homeybuild`);

// ===== 3. REMOVE non-runtime files =====
let removedCount = 0;
function removeByPattern(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeByPattern(fullPath, pattern);
    } else if (pattern.test(entry.name)) {
      fs.unlinkSync(fullPath);
      removedCount++;
    }
  }
}

// Remove .jpg files (never used by Homey SDK)
removeByPattern(BUILD_DIR, /\.jpg$/i);
// Remove .map files (source maps, not needed at runtime)
removeByPattern(BUILD_DIR, /\.map$/);

if (removedCount > 0) {
  console.log(` — Removed ${removedCount} non-runtime files (JPGs, source maps)`);
}

console.log('✅ Postbuild optimizations complete');
