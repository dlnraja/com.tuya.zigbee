#!/usr/bin/env node
/*
 * Project structure check (cross-platform)
 * Mirrors scripts/check_project_structure.bat in Node.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(title) { console.log(title); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.log(`[WARNING] ${msg}`); }
function err(msg) { console.log(`[ERROR] ${msg}`); }

function exists(p) { return fs.existsSync(p); }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function listDirs(p) {
  try { return fs.readdirSync(p).filter(n => isDir(path.join(p, n))); } catch { return []; }
}

function tryExec(cmd) {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim(); } catch { return null; }
}

(function main() {
  log('=== Project Structure Check ===');
  console.log();

  // Node.js and npm
  const nodeV = tryExec('node -v');
  if (!nodeV) {
    err('Node.js is not installed or not in PATH');
    process.exitCode = 1;
  } else {
    ok('Node.js is installed');
    console.log(nodeV);
  }

  const npmV = tryExec('npm -v');
  if (!npmV) {
    warn('npm is not in PATH');
  } else {
    ok('npm is installed');
    console.log(npmV);
  }

  console.log();
  log('=== Project Directories ===');

  const requiredDirs = ['drivers', 'scripts', path.join('.github', 'workflows')];
  for (const d of requiredDirs) {
    if (exists(d)) ok(`Directory exists: ${d}`); else console.log(`[MISSING] Directory not found: ${d}`);
  }

  console.log();
  log('=== Required Files ===');

  const requiredFiles = ['package.json', 'app.json', 'README.md'];
  for (const f of requiredFiles) {
    if (exists(f)) ok(`File exists: ${f}`); else console.log(`[MISSING] File not found: ${f}`);
  }

  console.log();
  log('=== Node Modules ===');
  if (exists('node_modules')) ok('node_modules directory exists'); else warn("node_modules directory not found. Run 'npm install' to install dependencies.");

  console.log();
  log('=== Checking Drivers ===');

  const driversDir = 'drivers';
  if (exists(driversDir)) {
    const dirs = listDirs(driversDir);
    console.log(`Found ${dirs.length} driver directories`);

    console.log();
    console.log('Sample driver check (first 5):');
    const sample = dirs.slice(0, 5);
    for (const d of sample) {
      console.log(`--- ${path.join(driversDir, d)} ---`);
      const base = path.join(driversDir, d);
      console.log(exists(path.join(base, 'device.js')) ? '  [OK] device.js' : '  [MISSING] device.js');
      console.log(exists(path.join(base, 'driver.js')) ? '  [OK] driver.js' : '  [MISSING] driver.js');
      console.log(exists(path.join(base, 'driver.compose.json')) ? '  [OK] driver.compose.json' : '  [MISSING] driver.compose.json');
      console.log(exists(path.join(base, 'README.md')) ? '  [OK] README.md' : '  [MISSING] README.md');
      console.log();
    }
  } else {
    err('drivers directory not found');
  }

  console.log();
  log('=== Check Complete ===');
})();
