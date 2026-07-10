#!/usr/bin/env node
'use strict';
// fix-flow-card-spam.js — Réduit le spam d'erreurs "Invalid Flow Card ID"
// en ne loguant que si developerDebugMode est activé.
// Les flow cards manquantes sont non-fatales (try/catch existant).

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.resolve(__dirname, '../../drivers');
const APPLY = process.argv.includes('--apply');

let fixed = 0;
let scanned = 0;

function processDriver(drvDir) {
  const drvjs = path.join(drvDir, 'driver.js');
  if (!fs.existsSync(drvjs)) return;
  scanned++;
  let content = fs.readFileSync(drvjs, 'utf8');
  if (!content.includes('Invalid Flow Card ID') && !content.includes('Flow card error')) {
    // Pas de spam explicite — mais vérifions les catch(err) avec this.error sur des flow cards
  }

  const original = content;
  // Pattern : catch (err) { this.error(`...Flow Card...: ${err.message}`); }
  // Devient : catch (err) { if (this.developerDebugMode) { this.error(`...`); } }
  // On cible les catch qui mentionnent Condition/Action/Flow card/Invalid
  content = content.replace(
    /(catch\s*\(\s*(?:err|e|error)\s*\)\s*\{\s*)this\.error\(`([^`]*(?:Condition|Action|Flow card|Flow Card|Invalid)[^`]*)`\s*\)/g,
    (match, catchStart, msg) => {
      // Wrap dans un guard developerDebugMode
      return `${catchStart}if (this.developerDebugMode) { this.error(\`${msg}\`); }`;
    }
  );

  if (content !== original) {
    fixed++;
    if (APPLY) {
      fs.writeFileSync(drvjs, content, 'utf8');
      console.log(`✅ ${path.basename(drvDir)}: spam réduit`);
    } else {
      console.log(`🔍 ${path.basename(drvDir)}: spam détecté (dry-run)`);
    }
  }
}

const dirs = fs.readdirSync(DRIVERS_DIR);
for (const d of dirs) {
  const full = path.join(DRIVERS_DIR, d);
  if (fs.statSync(full).isDirectory()) processDriver(full);
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`📊 ${scanned} drivers scannés, ${fixed} avec spam flow card`);
console.log(`   Mode: ${APPLY ? 'APPLY' : 'DRY-RUN (--apply pour corriger)'}`);
console.log(`═══════════════════════════════════════════════`);
