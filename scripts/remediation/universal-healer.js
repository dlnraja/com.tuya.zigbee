#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

/**
 * Universal Healer - Final Cleanup v22.0.2
 * Fixes syntax errors caused by previous aggressive healing passes.
 */
function healFile(absPath) {
  if (!fs.existsSync(absPath)) return;
  if (!absPath.endsWith('.js')) return;

  let content = fs.readFileSync(absPath, 'utf8');
  let original = content;

  // 1. FIX DAMAGE: Split .catch(e => ) ... );
  // This happened because the previous regex was too shallow.
  content = content.replace(/\.catch\(\s*([a-z])\s*=>\s*\)\s*\n\s+([^\n]+?)\s*\);/g, '.catch($1 => $2);');

  // 2. PROPER CATCH FIX: Handle missing closing parenthesis in .catch()
  // Pattern: .catch(err => this.log('message', err.message);
  // (Notice the last ) is missing before ;)
  content = content.replace(/\.catch\(\s*([a-zA-Z0-9_$]+)\s*=>\s*([^;]+)\s*[^\)]+;/g, (match) => {
    // If it already has balanced parens, leave it
    const opens = (match.match(/\(/g) || []).length;
    const closes = (match.match(/\)/g) || []).length;
    if (opens === closes) return match;
    
    // If missing one closing paren before semicolon
    if (opens === closes + 1 && match.endsWith(';')) {
        return match.replace(/;$/, ');');
    }
    return match;
  });

  // 3. Fix radiator controller logic corruption
  content = content.replace(/await\s*this\.setCapabilityValue\('target_temperature'\s*\*\s*20\)/g, "await this.setCapabilityValue('target_temperature', 20)");

  // 4. Fix plug driver redundant declaration
  content = content.replace(/const\s+args\.device/g, 'const val = args.device');

  // 5. Hardened math fixes
  content = content.replace(/Math\.round\(([a-zA-Z0-9_$.]+)\s*:\s*\1\)/g, 'Math.round($1) : $1');
  content = content.replace(/Math\.min\(([a-zA-Z0-9_$.]+)\s*\*\s*2\s*\*\s*100\)/g, 'Math.min(100, $1 * 2)');
  content = content.replace(/Math\.min\(([a-zA-Z0-9_$.]+)\s*\*\s*100\)/g, 'Math.min(100, $1)');

  if (content !== original) {
    fs.writeFileSync(absPath, content);
    console.log(`[HEALED] ${path.relative(ROOT, absPath)}`);
    return true;
  }
  return false;
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else {
      healFile(fullPath);
    }
  });
}

console.log('Starting Final Corrective Sweep...');
scanDir(path.join(ROOT, 'drivers'));
scanDir(path.join(ROOT, 'lib'));
console.log('Sweep complete.');
