#!/usr/bin/env node
'use strict';

console.log('🔧 Réparation en cours...');

const fs = require('fs');
const modules = [
  'tools/core/preparation.js',
  'tools/core/validator.js',
  'tools/core/matrix-builder.js',
  'tools/core/dashboard-builder.js',
  'tools/core/evidence-collector.js',
  'tools/core/enricher.js',
  'tools/core/web-enricher.js',
  'tools/core/final-validator.js',
  'tools/core/deployer.js',
  'tools/core/script-converter.js',
  'tools/core/script-consolidator.js'
];

let ok = 0;
let errors = 0;

for (const module of modules) {
  try {
    require(`./${module}`);
    console.log(`✅ ${module}`);
    ok++;
  } catch (e) {
    console.log(`❌ ${module}: ${e.message}`);
    errors++;
  }
}

console.log(`\n📊 ${ok}/${modules.length} modules OK`);
console.log(`❌ ${errors} erreurs`);
