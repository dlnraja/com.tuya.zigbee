#!/usr/bin/env node
'use strict';

/**
 * 🛠️ AUTONOMOUS CHARACTER SANITIZER v1.0
 * Recursively scans the project for invisible characters (null bytes, control chars, 
 * non-breaking spaces) and automatically removes/replaces them.
 * 
 * Target files: .js, .json, .md, .compose.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_EXTENSIONS = ['.js', '.json', '.md'];
const IGNORE_DIRS = ['node_modules', '.git', '.gemini', 'brain', 'scratch', 'assets', 'locales'];

const stats = {
  filesChecked: 0,
  filesFixed: 0,
  charsRemoved: 0
};

function sanitizeContent(content) {
  let initialLength = content.length;
  // v7.5.0: Aggressive cleanup logic aligned with CaseInsensitiveMatcher
  const sanitized = content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control characters (excluding \t, \n, \r)
    .replace(/\u00A0/g, ' ')  // Non-breaking space to regular space
    .replace(/\uFEFF/g, '')   // BOM (Byte Order Mark)
    .replace(/\u200B/g, '');  // Zero-width space

  const reduction = initialLength - sanitized.length;
  if (reduction > 0) {
    stats.charsRemoved += reduction;
  }
  return sanitized;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (IGNORE_DIRS.includes(file)) continue;
      processDirectory(fullPath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (TARGET_EXTENSIONS.includes(ext) || file.endsWith('.compose.json')) {
        stats.filesChecked++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const sanitized = sanitizeContent(content);

        if (sanitized !== content) {
          fs.writeFileSync(fullPath, sanitized, 'utf8');
          console.log(`✨ Sanitized: ${path.relative(ROOT, fullPath)}`);
          stats.filesFixed++;
        }
      }
    }
  }
}

console.log('🚀 Starting Autonomous Character Sanitization...');
try {
  processDirectory(ROOT);
  console.log('\n📊 Sanitization Summary:');
  console.log(`- Files Checked: ${stats.filesChecked}`);
  console.log(`- Files Fixed: ${stats.filesFixed}`);
  console.log(`- Invisible Characters Removed: ${stats.charsRemoved}`);
  console.log('\n✅ System Integrity Restored.');
} catch (error) {
  console.error(`❌ Error during sanitization: ${error.message}`);
}
