#!/usr/bin/env node
'use strict';

/**
 * ARITHMETIC INTEGRITY CHECK
 * Detects corruption where regex literals were incorrectly wrapped in safeDivide/safeMultiply.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targetDirs = ['drivers', 'lib'];

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

console.log('--- ARITHMETIC INTEGRITY AUDIT ---');
let errors = 0;

walk(ROOT, (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    // Look for safeDivide(something that looks like a regex fragment, ...)
    // Common corruption pattern: safeDivide([, hybrid)/i
    if (line.includes('safeDivide') || line.includes('safeMultiply')) {
      if (line.includes(')/i') || line.includes(')/g') || line.includes(')/gi') || 
          line.includes('safeDivide([') || line.includes('safeDivide(/')) {
        errors++;
        console.log(`CORRUPTION DETECTED: ${path.relative(ROOT, file)}:${idx + 1}`);
        console.log(`Line: ${line.trim()}`);
      }
    }
  });
});

console.log(`--- Total Corruptions: ${errors} ---`);
if (errors > 0) {
  process.exit(1);
}
