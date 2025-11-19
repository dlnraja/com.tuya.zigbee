#!/usr/bin/env node
'use strict';

/**
 * FIX INCOMPLETE COMMENT BLOCKS
 * Fixes files where registerCapability code is partially commented
 * causing "Missing catch or finally clause" errors
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const baseDir = path.join(__dirname, '..');

// Pattern: Incomplete comment with trailing uncommented closing braces
const PATTERN = /\/\/ this\.registerCapability\([^;]+\{[\s\S]*?(\n\s+)\}\s*\n\s+\},\s*\n\s+getOpts:\s*\{/g;

async function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix pattern: Comment out the remaining closing braces
    content = content.replace(
      /\/\/ this\.registerCapability\(([^)]+)\), \{[\s\S]*?(\n\s+)(\})\s*\n\s+(\}),\s*\n\s+(getOpts:\s*\{[\s\S]*?\n\s+\})\s*\n\s+(\}\);)/g,
      (match) => {
        // Comment out all lines after the initial //
        const lines = match.split('\n');
        const result = lines.map((line, idx) => {
          if (idx === 0) return line; // Keep first line as is (already has //)
          if (line.trim() && !line.trim().startsWith('//')) {
            return '// ' + line;
          }
          return line;
        });
        return result.join('\n');
      }
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error fixing ${filePath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🔧 FIXING INCOMPLETE COMMENT BLOCKS\n');

  // Find all device.js files
  const files = glob.sync('drivers/*/device.js', { cwd: baseDir, absolute: true });

  let fixed = 0;
  let skipped = 0;

  for (const file of files) {
    const wasFixed = await fixFile(file);
    if (wasFixed) {
      console.log(`✅ Fixed: ${path.relative(baseDir, file)}`);
      fixed++;
    } else {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Fixed: ${fixed} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log('='.repeat(50));
}

main().catch(console.error);
