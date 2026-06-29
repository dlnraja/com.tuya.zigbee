#!/usr/bin/env node
'use strict';
// fix-button-capability-options.js — Corrige capabilitiesOptions pour les boutons
// ROOT CAUSE : button.* setable/getable ambigu → Homey peut attendre un listener,
// et les assistants vocaux peuvent interpréter des boutons virtuels comme des
// commandes alors que les vrais contrôles passent par onoff/windowcoverings/etc.
// FIX : button.* = event/maintenance only, jamais une commande vocale.
// Doc de référence : docs/BUTTON_CAPABILITY_GUIDE.md

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');

let fixed = 0;

function processDriver(driverDir) {
  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;

  const driverName = path.basename(driverDir);

  let content;
  try { content = JSON.parse(fs.readFileSync(composePath, 'utf8')); }
  catch (e) { return; }

  const caps = content.capabilities || [];
  const hasButton = caps.some(c => c.startsWith('button.'));
  if (!hasButton) return;

  const opts = content.capabilitiesOptions || {};
  let changed = false;

  for (const capId of caps) {
    if (!capId.startsWith('button.')) continue;
    if (!opts[capId]) opts[capId] = {};
    // FIX : setable doit être false (event/maintenance-only), pas true
    if (opts[capId].setable !== false) {
      opts[capId].setable = false;
      changed = true;
    }
    // FIX : maintenanceAction true (cache le widget non-fonctionnel)
    if (!opts[capId].maintenanceAction) {
      opts[capId].maintenanceAction = true;
      changed = true;
    }
    // FIX : getable false (pas d'état lisible)
    if (opts[capId].getable !== false) {
      opts[capId].getable = false;
      changed = true;
    }
  }

  // Retire le maintenanceAction global mal placé (doit être par-capability)
  if (opts.maintenanceAction !== undefined) {
    delete opts.maintenanceAction;
    changed = true;
  }

  if (changed) {
    content.capabilitiesOptions = opts;
    if (APPLY) {
      fs.writeFileSync(composePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      try { JSON.parse(fs.readFileSync(composePath, 'utf8')); }
      catch (e) { console.error(`❌ Corruption: ${path.basename(driverDir)}`); return; }
      fixed++;
      console.log(`✅ ${path.basename(driverDir)}: button caps → getable:false + setable:false + maintenanceAction:true`);
    } else {
      console.log(`🔍 ${path.basename(driverDir)}: needs fix (dry-run)`);
    }
  }
}

const dirs = fs.readdirSync(DRIVERS_DIR);
for (const d of dirs) {
  const full = path.join(DRIVERS_DIR, d);
  if (fs.statSync(full).isDirectory()) processDriver(full);
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`📊 Drivers corrigés: ${fixed}`);
console.log(`   Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log(`═══════════════════════════════════════════════`);
