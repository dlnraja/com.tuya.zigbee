#!/usr/bin/env node
/**
 * scripts/remediation/fix-pollution.js
 * v1.1.0: Global cleanup of safeDivide/safeParse pollution in strings and comments.
 * Now handles backticks and // comments.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (['node_modules', '.git', '.gemini', 'brain', 'scratch'].includes(file)) continue;
      walk(full, callback);
    } else if (file.endsWith('.js') || file.endsWith('.json')) {
      callback(full);
    }
  }
}

console.log(' Starting improved pollution cleanup (strings & comments)...');

let totalFiles = 0;
let totalCorrections = 0;

walk(ROOT, (absPath) => {
  let content = fs.readFileSync(absPath, 'utf8');
  const original = content;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // 1. Fix polluted strings (enclosed in ', ", or `)
    // Matches: [quote][text]a/b[text][quote]
    line = line.replace(/(['"`])(.*?)\bsafeDivide\((.*?   ) ,\s*(.*? ))(.*? )\1/g, (match, quote, before, num, den, after) => {
        // Only replace if it doesn't look like code (e.g. if num or den contain punctuation that isn't expected in a variable )
        // OR simply if it's inside a log/comment.
        console.log(`   [FIX-STR] ${path.relative(ROOT, absPath)}:L${i+1}: ${match}`);
        return `${quote}${before}${num}/${den}${after}${quote}`;
    });

    line = line.replace(/(['"`])(.*?)\bsafeParse\((.*?   ) ,\s*(.*? ))(.*? )\1/g, (match, quote, before, num, den, after ) => {
        console.log(`   [FIX-STR] ${path.relative(ROOT, absPath)}:L${i+1}: ${match}`);
        return `${quote}${before}${num}/${den}${after}${quote}`;
    });

    // 2. Fix polluted comments (lines starting with 
    if (line.includes('//')) {
        line = line.replace(/\/\/.*?\bsafeDivide\((.*?   ) ,\s*(.*? )\)/g, (match, num, den ) => {
            console.log(`   [FIX-CMT] ${path.relative(ROOT, absPath)}:L${i+1}: ${match}`);
            return match.replace(`${num}/${den}`, `${num}/${den}`);
        });
        line = line.replace(/\/\/.*?\bsafeParse\((.*?   ) ,\s*(.*? )\)/g, (match, num, den ) => {
            console.log(`   [FIX-CMT] ${path.relative(ROOT, absPath)}:L${i+1}: ${match}`);
            return match.replace(`${num}/${den}`, `${num}/${den}`);
        });
    }

    if (line !== originalLine) {
        // Multi-pass check (sometimes multiple occurrences on one line)
        lines[i] = line;
        totalCorrections++;
    }
  }

  if (lines.join('\n') !== original) {
    fs.writeFileSync(absPath, lines.join('\n'));
    totalFiles++;
  }
});

console.log(`\n Cleanup complete: ${totalFiles} files fixed, ${totalCorrections} lines restored.`);
