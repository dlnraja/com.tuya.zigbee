#!/usr/bin/env node
'use strict';

/**
 * smart-json-merge.js
 * Intelligent merge utility for driver mapping databases.
 * Handles conflicts by deep-merging objects and unique-merging arrays.
 * v1.0.0
 */

const fs = require('fs');

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      if (Array.isArray(source[key]) && Array.isArray(target[key])) {
        // Merge arrays uniquely
        target[key] = [...new Set([...target[key], ...source[key]])];
      } else {
        deepMerge(target[key], source[key]);
      }
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function mergeFiles(fileA, fileB, targetFile) {
  console.log(`Merging ${fileA} and ${fileB} into ${targetFile}...`);
  
  let dataA = {};
  let dataB = {};
  
  if (fs.existsSync(fileA)) {
    try { dataA = JSON.parse(fs.readFileSync(fileA, 'utf8')); } catch (e) { console.error(`Err reading ${fileA}:`, e.message); }
  }
  
  if (fs.existsSync(fileB)) {
    try { dataB = JSON.parse(fs.readFileSync(fileB, 'utf8')); } catch (e) { console.error(`Err reading ${fileB}:`, e.message); }
  }
  
  const merged = deepMerge(dataA, dataB);
  
  // Sort keys alphabetically for stability
  const sorted = {};
  Object.keys(merged).sort().forEach(key => {
    sorted[key] = merged[key];
  });
  
  fs.writeFileSync(targetFile, JSON.stringify(sorted, null, 2));
  console.log(`✅ Success: ${Object.keys(sorted).length} entries merged.`);
}

if (require.main === module) {
  const [,, fileA, fileB, targetFile] = process.argv;
  if (!fileA || !fileB || !targetFile) {
    console.log('Usage: node smart-json-merge.js <fileA> <fileB> <target>');
    process.exit(1);
  }
  mergeFiles(fileA, fileB, targetFile);
}

module.exports = { deepMerge };
