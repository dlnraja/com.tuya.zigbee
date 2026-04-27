#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

/**
 * GLOBAL CORRUPTION CLEANER v1.1.0
 * 
 * Purges injected ": null" syntax errors.
 * Refined to avoid breaking valid ternaries.
 */

const targetDirs = ['.', 'drivers', 'lib', 'scripts', '.github'];
const targetExtensions = ['.js', '.json'];

function walk(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(fullPath, callback);
    } else {
      const ext = path.extname(entry.name);
      if (targetExtensions.includes(ext)) {
        callback(fullPath);
      }
    }
  }
}

let filesCleaned = 0;

function cleanFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Fix corrupted safeDivide/safeMultiply calls in remediation scripts
  content = content.replace(/\\ : null\)/g, ')');
  
  const lines = content.split('\n');
  const cleanedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return line;

    // Detect if this line has a "stray" : null
    // Rule: If it has ": null" but NO "?" (outside of strings)
    // For simplicity, we check if it has ": null" and count "?" 
    if (line.includes(': null')) {
       // Strip strings for count
       const stripped = line.replace(/(['"`])(.*?)\1/g, '$1$1');
       if (!stripped.includes('?') && !stripped.includes('case ') && !stripped.includes('default:')) {
          // Definitely stray
          return line.replace(/\s*: null\s*([;)])/g, '$1');
       }
       
       // Handle the specific corrupted regex pattern
       if (line.includes('(? !\\1). : null')) {
          return line.replace(/\(\? !\\1\)\. : null\)\*\?\s*: null\)/g, '(?!\\1).)*?');
       }
    }
    return line;
  });
  
  content = cleanedLines.join('\n');

  // 3. Fix specific corrupted expressions found in drivers (only if they don't look like ternaries)
  // return /.../.test(l); -> the previous rule might have missed it if it had a ? in the regex
  // So we target the .test(...) : null pattern specifically
  content = content.replace(/\.test\((.*?)\)\s*: null\s*;/g, '.test($1);');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    filesCleaned++;
    console.log(`[FIXED] ${path.relative(ROOT, file)}`);
  }
}

console.log(' Starting Global Corruption Cleanup v1.1.0...');
targetDirs.forEach(dir => {
  const absDir = path.resolve(ROOT, dir);
  if (fs.existsSync(absDir)) {
    if (fs.statSync(absDir).isDirectory()) {
      walk(absDir, cleanFile);
    } else {
      cleanFile(absDir);
    }
  }
});

console.log(`\n Cleanup complete. ${filesCleaned} files remediated.`);
