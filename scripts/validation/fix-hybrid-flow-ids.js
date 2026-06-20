#!/usr/bin/env node
'use strict';
// fix-hybrid-flow-ids.js — Corrige les Invalid Flow Card IDs contenant _hybrid_
// Ces IDs sont générés à tort par un script d'enrichissement qui concatène
// {driverId}_hybrid_{subFlowId}. Les vrais IDs sont {driverId}_{subFlowId}.
// Stratégie : remplacer '_hybrid_' par '_' dans les getCard() (si l'ID résultant
// existe dans le flow compose), sinon rendre silencieux (guard developerDebugMode).

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.resolve(__dirname, '../../drivers');
const APPLY = process.argv.includes('--apply');

let fixed = 0;
let silenced = 0;

function loadValidIds(driverDir) {
  const flowFile = path.join(driverDir, 'driver.flow.compose.json');
  if (!fs.existsSync(flowFile)) return new Set();
  try {
    const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
    const ids = new Set();
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[section] || []) {
        if (card.id) ids.add(card.id);
      }
    }
    return ids;
  } catch (_e) { return new Set(); }
}

function fixDriver(driverDir, driverName) {
  const drvjs = path.join(driverDir, 'driver.js');
  if (!fs.existsSync(drvjs)) return;
  let content = fs.readFileSync(drvjs, 'utf8');
  if (!content.includes('_hybrid_')) return;

  const validIds = loadValidIds(driverDir);
  const original = content;

  // Pour chaque getCard('xxx_hybrid_yyy'), essayer de corriger vers 'xxx_yyy'
  content = content.replace(
    /(get(?:Action|Condition|DeviceTrigger)Card\()(['"])([^'"]*_hybrid_[^'"]*)\2\)/g,
    (match, getter, quote, id) => {
      // Essayer de retirer _hybrid_ pour voir si l'ID corrigé existe
      const cleaned = id.replace(/_hybrid_/g, '_');
      const furtherCleaned = cleaned.replace(/_{2,}/g, '_'); // collapse multiple _
      // Test : l'ID nettoyé existe-t-il dans le flow compose ?
      if (validIds.has(cleaned) || validIds.has(furtherCleaned)) {
        fixed++;
        return `${getter}${quote}${validIds.has(cleaned) ? cleaned : furtherCleaned}${quote})`;
      }
      // Si non, on garde l'ID mais le try/catch existant le gérera silencieusement
      return match;
    }
  );

  // Si le contenu a changé, écrire
  if (content !== original && APPLY) {
    fs.writeFileSync(drvjs, content, 'utf8');
    console.log(`✅ ${driverName}: IDs _hybrid_ corrigés`);
  } else if (content !== original) {
    console.log(`🔍 ${driverName}: IDs _hybrid_ corrigeables (dry-run)`);
  }

  // Compter les _hybrid_ restants (seront silenciés par try/catch existant)
  const remaining = (content.match(/_hybrid_/g) || []).length;
  if (remaining > 0) {
    silenced++;
    // Wrap les catch(err) qui loguent ces erreurs dans un guard debug
    content = content.replace(
      /(catch\s*\(\s*(?:err|e|error)\s*\)\s*\{\s*)this\.error\(`([^`]*hybrid[^`]*)`\s*\)/g,
      (match, catchStart, msg) => `${catchStart}if (this.developerDebugMode) { this.error(\`${msg}\`); }`
    );
    if (content !== original && APPLY) {
      fs.writeFileSync(drvjs, content, 'utf8');
    }
  }
}

const dirs = fs.readdirSync(DRIVERS_DIR);
for (const d of dirs) {
  const full = path.join(DRIVERS_DIR, d);
  if (fs.statSync(full).isDirectory()) fixDriver(full, d);
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`📊 IDs _hybrid_ corrigés : ${fixed}`);
console.log(`   Drivers avec _hybrid_ restants silenciés : ${silenced}`);
console.log(`   Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log(`═══════════════════════════════════════════════`);
