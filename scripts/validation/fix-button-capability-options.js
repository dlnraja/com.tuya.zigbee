#!/usr/bin/env node
'use strict';
// fix-button-capability-options.js — Corrige capabilitiesOptions pour les boutons
// ROOT CAUSE : setable:true → Homey exige registerCapabilityListener
// FIX : setable:false + maintenanceAction:true (event-only, pas de listener requis)
// Doc de référence : docs/BUTTON_CAPABILITY_GUIDE.md lignes 148-152

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

  // Skip les switches (ils ont button.X pour double-clic mais setable:true est légitime)
  // On ne corrige QUE les boutons purs (event-only)
  const isSwitch = driverName.startsWith('switch') || driverName === 'switch' ||
                   driverName.startsWith('wall_switch') || driverName.startsWith('plug');
  if (isSwitch) return;

  const opts = content.capabilitiesOptions || {};
  let changed = false;

  for (const capId of caps) {
    if (!capId.startsWith('button.')) continue;
    if (!opts[capId]) opts[capId] = {};
    // FIX : setable doit être false (event-only), pas true
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
      console.log(`✅ ${path.basename(driverDir)}: button caps → setable:false + maintenanceAction:true`);
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
