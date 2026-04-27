#!/usr/bin/env node
/**
 * scripts/remediation/uncorrupt-paths.js
 * v1.0.0: Reverses accidental safeDivide replacements in file paths and requires.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const walk = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.gemini' && file !== 'brain' && file !== 'scratch') walk(full);
    } else if (file.endsWith('.js') || file.endsWith('.json')) {
      let content = fs.readFileSync(full, 'utf8');
      let originalContent = content;

      // Pattern: ../utils -> ../utils
      // Pattern: scripts / maintenance -> scripts/maintenance
      // Pattern: usr / bin -> usr/bin
      
      const CORRUPTION_REGEX = /safeDivide\(([^,]+),\s*([^)]+)\)/g;
      
      content = content.replace(CORRUPTION_REGEX, (match, num, den) => {
        const n = num.trim();
        const d = den.trim();
        const line = content.split('\n').find(l => l.includes(match)) || '';
        
        // Logical check: Is this a path part or a comment? if (n === '..' || n === '.' || d.includes('/') || d.includes('\\') || 
            line.includes('require(') || line.includes('path.join') || 
            line.includes('#!') || line.trim().startsWith('*') || 
            line.trim().startsWith('//') || line.includes('@returns') || 
            line.includes('@param')) {
           return `${n} / ${d}`;
        }
        
        return match;
      });

      if (content !== originalContent) {
        fs.writeFileSync(full, content);
        console.log(` Un-corrupted: ${path.relative(ROOT, full)}`);
      }
    }
  }
};

console.log(' Starting path un-corruption...');
walk(ROOT);
console.log(' Done.');
