/**
 * scripts/fixes/GENERALIZE_BRANDING.js
 * 
 * Renames proprietary branding (Hybrid Engine, Core Reimplementation) to generic reimplementation names.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const REPLACEMENTS = [
  { from: /Universal Engine Reimplementation/g, to: 'Universal Engine Reimplementation' },
  { from: /Autonomous Engine Reimplementation/g, to: 'Autonomous Engine Reimplementation' },
  { from: /Self-Healing Reimplementation Engine/g, to: 'Self-Healing Reimplementation Engine' },
  { from: /Thinking Reimplementation Engine/g, to: 'Thinking Reimplementation Engine' },
  { from: /Shadow Reimplementation Engine/g, to: 'Shadow Reimplementation Engine' },
  { from: /Maintenance Reimplementation Orchestrator/g, to: 'Maintenance Reimplementation Orchestrator' },
  { from: /Engine Maintenance/g, to: 'Engine Maintenance' },
  { from: /Hybrid Engine/g, to: 'Hybrid Engine' },
  { from: /\bProxima\b/g, to: 'Core Reimplementation' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (const r of REPLACEMENTS) {
    content = content.replace(r.from, r.to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(` Refactored branding in: ${path.relative(ROOT, filePath)}`);
    return true;
  }
  return false;
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.homeybuild') {
        walk(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (['.js', '.json', '.md', '.txt'].includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

console.log(' Starting Global Branding Generalization...');
walk(ROOT);
console.log(' Branding generalization complete.');
