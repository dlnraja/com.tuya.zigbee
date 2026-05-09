#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

function findFiles(dir, ext, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
      findFiles(full, ext, results);
    } else if (e.isFile() && e.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function fixExtendsSpaces() {
  console.log('🛡️ Starting global fix for missing spaces after "extends"...\n');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let fixedCount = 0;

  for (const file of jsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Matches 'extends' immediately followed by an uppercase letter
    // and captures the uppercase word to insert a space.
    // e.g., 'extendsSensorBase' -> 'extends SensorBase'
    const extendsRegex = /\bextends([A-Z][a-zA-Z0-9_]+)\b/g;

    content = content.replace(extendsRegex, 'extends $1');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
      console.log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`\n🎉 Completed! Corrected extends spacing in ${fixedCount} files.`);
}

fixExtendsSpaces();
