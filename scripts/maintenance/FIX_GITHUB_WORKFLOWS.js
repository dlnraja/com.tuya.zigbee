#!/usr/bin/env node
'use strict';

/**
 * FIX GITHUB WORKFLOWS
 * 
 * Désactive tous les anciens workflows et crée les workflows officiels Homey
 */

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '../../.github/workflows');

console.log('🔧 FIX GITHUB WORKFLOWS\n');
console.log('═══════════════════════════════════════════════════\n');

// Workflows à garder (officiels Homey)
const KEEP_WORKFLOWS = [
  'validate.yml',
  'publish.yml',
  'auto-organize.yml'
];

// Liste tous les workflows
const workflows = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));

console.log(`📊 Found ${workflows.length} workflows\n`);

let disabled = 0;
let kept = 0;

// Désactive les anciens workflows
workflows.forEach(workflow => {
  if (KEEP_WORKFLOWS.includes(workflow)) {
    console.log(`✅ Keep: ${workflow}`);
    kept++;
  } else {
    const oldPath = path.join(WORKFLOWS_DIR, workflow);
    const newPath = path.join(WORKFLOWS_DIR, workflow + '.disabled');
    
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`🔒 Disabled: ${workflow}`);
      disabled++;
    } catch (err) {
      console.error(`❌ Failed to disable ${workflow}:`, err.message);
    }
  }
});

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ CLEANUP COMPLETE');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Workflows kept: ${kept}`);
console.log(`Workflows disabled: ${disabled}`);
console.log('');
console.log('Active workflows:');
KEEP_WORKFLOWS.forEach(w => console.log(`  - ${w}`));
console.log('');
