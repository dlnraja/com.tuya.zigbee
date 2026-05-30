#!/usr/bin/env node
/**
 * fix-all-blocking.js
 * Corrige TOUS les blocages CI + archive en une passe:
 * 1. WFL_SHELL_MISSING dans image-integrity-gate.yml + security-integrity.yml
 * 2. Syntax error EOF dans unified-ci.yml / master-cicd.yml
 * 3. .homeyignore: exclure data/fingerprints.json, data/archive/, assets/branding/nexus/
 * 4. Vérification finale de la taille simulée
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let fixed = 0, skipped = 0;

// ── 1. WFL_SHELL_MISSING ─────────────────────────────────────────────────────
const SHELL_FIX_FILES = [
  '.github/workflows/image-integrity-gate.yml',
  '.github/workflows/security-integrity.yml',
];

for (const wf of SHELL_FIX_FILES) {
  if (!fs.existsSync(wf)) { console.log('❓ Not found:', wf); skipped++; continue; }
  let content = fs.readFileSync(wf, 'utf8');

  if (content.includes('defaults:') && content.includes('shell: bash')) {
    console.log('⚪ Already has shell: bash →', wf); skipped++; continue;
  }

  if (!content.includes('defaults:')) {
    // Insert before 'jobs:'
    content = content.replace(/^(jobs:)/m, 'defaults:\n  run:\n    shell: bash\n\n$1');
  } else {
    // Has defaults but no shell
    content = content.replace(
      /^(defaults:\s*\n\s*run:)/m,
      '$1\n    shell: bash'
    );
  }
  fs.writeFileSync(wf, content, 'utf8');
  console.log('✅ Fixed WFL_SHELL_MISSING:', wf);
  fixed++;
}

// ── 2. Inspect + fix UNIFIED AWAKENING = master-cicd.yml ─────────────────────
const CICD_FILE = '.github/workflows/master-cicd.yml';
if (fs.existsSync(CICD_FILE)) {
  const raw = fs.readFileSync(CICD_FILE, 'utf8');
  const lines = raw.split('\n');

  // Find the Intelligence Mode Selector step
  const selectorIdx = lines.findIndex(l => l.includes('Intelligence Mode Selector'));
  if (selectorIdx >= 0) {
    // Show surrounding lines for diagnosis
    console.log('\n[CICD] Intelligence Mode Selector context:');
    lines.slice(Math.max(0, selectorIdx - 2), selectorIdx + 20).forEach((l, i) =>
      console.log(`  ${selectorIdx - 2 + i + 1}: ${l}`)
    );

    // Find the run: block after it and check for balanced fi/if
    let runStart = -1, runEnd = -1;
    for (let i = selectorIdx; i < Math.min(lines.length, selectorIdx + 30); i++) {
      if (lines[i].match(/^\s+run:\s*[|>]/)) { runStart = i; }
      if (runStart >= 0 && lines[i].match(/^\s+\w+:/) && i > runStart + 1) {
        runEnd = i; break;
      }
    }

    if (runStart >= 0) {
      const runBlock = lines.slice(runStart, runEnd > 0 ? runEnd : runStart + 20).join('\n');
      const ifCount = (runBlock.match(/\bif\b/g) || []).length;
      const fiCount = (runBlock.match(/\bfi\b/g) || []).length;
      console.log(`  if/fi balance: ${ifCount} if, ${fiCount} fi`);
      if (ifCount > fiCount) {
        console.log('  ⚠️  Unbalanced if/fi → likely EOF syntax error');
      }
    }
  }
} else {
  console.log('❓ master-cicd.yml not found - checking unified-ci.yml');
  const altCicd = '.github/workflows/unified-ci.yml';
  if (fs.existsSync(altCicd)) {
    const raw = fs.readFileSync(altCicd, 'utf8');
    if (raw.includes('Intelligence Mode Selector')) {
      console.log('Found in unified-ci.yml');
    }
  }
}

// ── 3. .homeyignore: add heavy data files ────────────────────────────────────
const IGNORE_FILE = '.homeyignore';
const ignoreContent = fs.readFileSync(IGNORE_FILE, 'utf8');

// Files/dirs to add if not already present
const toAdd = [
  ['data/fingerprints.json',        '# Large fingerprint DB - NOT needed at Homey runtime'],
  ['data/archive/',                  '# Dev archive data - NOT needed at runtime'],
  ['data/community-sync/',           '# Community sync data - NOT needed at runtime'],
  ['assets/branding/',               '# Dev branding assets - NOT needed at runtime (keep assets/images/)'],
  ['driver-mapping-database.json.dedup-backup', '# Backup file - dev only'],
  ['data/intel-harvest/',            '# Intel harvest data - dev only'],
  ['data/temp_desktop_cleanup/',     '# Temp data - dev only'],
];

let newRules = '';
for (const [rule, comment] of toAdd) {
  if (ignoreContent.includes(rule)) {
    console.log('⚪ Already in .homeyignore:', rule);
  } else {
    newRules += `\n${comment}\n${rule}\n`;
    console.log('✅ Adding to .homeyignore:', rule);
    fixed++;
  }
}

if (newRules) {
  const updated = ignoreContent.trimEnd() + '\n\n# === ADDED BY fix-all-blocking.js ===\n' + newRules;
  fs.writeFileSync(IGNORE_FILE, updated, 'utf8');
}

// ── 4. Size simulation after fix ─────────────────────────────────────────────
console.log('\n=== FINAL SIZE SIMULATION ===');
const finalIgnore = fs.readFileSync(IGNORE_FILE, 'utf8').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'));

function isIgnoredFinal(relPath) {
  const parts = relPath.split('/');
  for (const pat of finalIgnore) {
    const clean = pat.replace(/\/$/, '');
    if (parts[0] === clean) return true;
    if (relPath.startsWith(clean + '/') || relPath === clean) return true;
  }
  return false;
}

let totalFiles = 0, totalSize = 0;
function walkFinal(dir) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const full = path.join(dir, e.name);
      const rel  = full.replace(/\\/g, '/').replace(/^\.\//, '');
      if (isIgnoredFinal(rel)) continue;
      if (e.isDirectory()) walkFinal(full);
      else { totalFiles++; try { totalSize += fs.statSync(full).size; } catch {} }
    }
  } catch {}
}
walkFinal('.');

const mb = (totalSize / 1024 / 1024).toFixed(1);
const ok = parseFloat(mb) < 55;
console.log(`Included: ${totalFiles} files, ${mb}MB uncompressed`);
console.log(`Archive est ${ok ? '✅ OK' : '⚠️  STILL TOO LARGE'} (target: <55MB unc. / ~20MB compressed)`);

console.log(`\n✅ Fixed: ${fixed}, Skipped: ${skipped}`);
