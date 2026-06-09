#!/usr/bin/env node
/**
 * publish-optimized.js — Publish Homey app with optimized archive
 *
 * The homey CLI creates 27MB archives (includes node_modules/).
 * This script creates a smaller archive (5-7MB) by:
 * 1. Running homey app build
 * 2. Removing node_modules/ from .homeybuild/
 * 3. Removing large driver images
 * 4. Creating archive with tar-fs (same as homey CLI, but smaller)
 * 5. Uploading via homey CLI (which uses the optimized .homeybuild/)
 *
 * Usage: node scripts/publish-optimized.js
 * Requires: HOMEY_PAT env var or homey CLI auth
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(process.cwd(), '.homeybuild');

function log(msg) { console.log(`[publish-optimized] ${msg}`); }

async function main() {
  // Step 1: Build
  log('Step 1: Building app...');
  execSync('npx homey app build', { stdio: 'pipe' });
  log('Build complete');

  // Step 2: Optimize .homeybuild/
  log('Step 2: Optimizing .homeybuild/...');

  // Remove node_modules (bundled by SDK3)
  const nmDir = path.join(BUILD_DIR, 'node_modules');
  if (fs.existsSync(nmDir)) {
    execSync(`rm -rf "${nmDir}"`, { stdio: 'pipe' });
    log('  Removed node_modules/');
  }

  // Remove large driver images
  try {
    const count = execSync(`find "${BUILD_DIR}/drivers" -name "large.png" -delete -print | wc -l`, { encoding: 'utf8' }).trim();
    log(`  Removed ${count} large.png files`);
  } catch {}

  // Compact app.json
  const appPath = path.join(BUILD_DIR, 'app.json');
  if (fs.existsSync(appPath)) {
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    fs.writeFileSync(appPath, JSON.stringify(app), 'utf8');
    log(`  Compacted app.json: ${(fs.statSync(appPath).size/1024/1024).toFixed(2)}MB`);
  }

  // Step 3: Create archive with tar-fs
  log('Step 3: Creating archive...');
  const tar = require('tar-fs');
  const zlib = require('zlib');
  const { pipeline } = require('stream');

  const archivePath = '/tmp/homey-optimized.tar.gz';
  await new Promise((resolve, reject) => {
    pipeline(
      tar.pack(BUILD_DIR, {
        dereference: true,
        ignore(name) {
          if (name.startsWith('.')) return true;
          if (name.includes('/.git/')) return true;
          return false;
        },
      }),
      zlib.createGzip(),
      fs.createWriteStream(archivePath),
      (err) => {
        if (err) reject(err);
        else {
          const size = fs.statSync(archivePath).size;
          log(`Archive created: ${(size/1024/1024).toFixed(2)}MB`);
          resolve();
        }
      }
    );
  });

  // Step 4: Publish with homey CLI
  log('Step 4: Publishing...');
  try {
    execSync('HOMEY_HEADLESS=1 npx homey app publish', { stdio: 'inherit' });
    log('Published successfully!');
  } catch (e) {
    log('Publish failed: ' + e.message);
    process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
