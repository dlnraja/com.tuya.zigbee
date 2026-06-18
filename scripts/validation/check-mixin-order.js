#!/usr/bin/env node
'use strict';
// v9.0.40: Mixin Order Validator
// Ensures all drivers use the correct mixin order:
// PhysicalButtonMixin(VirtualButtonMixin(BaseClass))
// NOT VirtualButtonMixin(PhysicalButtonMixin(BaseClass))

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

let errors = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      scanDir(path.join(dir, entry.name));
    } else if (entry.name === 'device.js') {
      checkFile(path.join(dir, entry.name));
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);

  // Check for reversed mixin order
  const reversed = content.match(/VirtualButtonMixin\s*\(\s*PhysicalButtonMixin\s*\(/g);
  if (reversed) {
    console.log(`❌ [ERROR] ${relPath}: Reversed mixin order (VirtualButtonMixin(PhysicalButtonMixin(...)))`);
    console.log(`   Should be: PhysicalButtonMixin(VirtualButtonMixin(BaseClass))`);
    errors++;
  }

  // Check for missing VirtualButtonMixin import when used in class
  if (content.includes('VirtualButtonMixin(')) {
    const hasImport = content.match(/(?:const|let|var)\s+VirtualButtonMixin\s*=\s*require\s*\(/);
    const hasDestructure = content.match(/\{\s*VirtualButtonMixin\s*\}\s*=\s*require\s*\(/);
    if (!hasImport && !hasDestructure) {
      console.log(`❌ [ERROR] ${relPath}: VirtualButtonMixin used but not imported`);
      errors++;
    }
  }

  // Check for missing PhysicalButtonMixin import when used in class
  if (content.includes('PhysicalButtonMixin(')) {
    const hasImport = content.match(/(?:const|let|var)\s+PhysicalButtonMixin\s*=\s*require\s*\(/);
    const hasDestructure = content.match(/\{\s*PhysicalButtonMixin\s*\}\s*=\s*require\s*\(/);
    if (!hasImport && !hasDestructure) {
      console.log(`❌ [ERROR] ${relPath}: PhysicalButtonMixin used but not imported`);
      errors++;
    }
  }
}

console.log('🔍 Scanning all drivers for mixin order...\n');
scanDir(DRIVERS_DIR);

console.log(`\n📊 Results: ${errors} errors`);
if (errors > 0) {
  console.log('❌ FAILED');
  process.exit(1);
} else {
  console.log('✅ PASSED - All mixin orders correct');
}
