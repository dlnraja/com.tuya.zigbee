#!/usr/bin/env node
'use strict';
/**
 * SANITIZER SCRIPT
 * Shadow Mode - removes Zero-Width Characters and BOMs from manifests.
 * Prevents Homey parser crashes.
 */
const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
  path.join(__dirname, '..'), // app.json
  path.join(__dirname, '..', 'drivers') // all driver manifests
];

// Regex for invisible characters: Zero Width Space (\u200B), BOM (\uFEFF), LTR Override (\u202D), etc.
const INVISIBLE_CHARS_REGEX = /[\u200B\uFEFF\u202D\u200E\u200F\u202A-\u202E]/g;

function sanitizeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    if (INVISIBLE_CHARS_REGEX.test(content)) {
      console.log(`[SANITIZER] Cleaning ${filePath}...`);
      const cleaned = content.replace(INVISIBLE_CHARS_REGEX, '');
      fs.writeFileSync(filePath, cleaned, 'utf8');
    }
  } catch (err) {
    console.error(`[SANITIZER] Error reading ${filePath}:`, err.message);
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && dir.includes('drivers')) {
      // It's a driver dir
      scanDirectory(fullPath);
    } else if (file.endsWith('.json')) { // Focus on JSON manifests
      sanitizeFile(fullPath);
    }
  }
}

console.log('[SANITIZER] Running invisible character wipe...');
for (const dir of DIRECTORIES_TO_SCAN) {
  scanDirectory(dir);
}
console.log('[SANITIZER] Complete.');
