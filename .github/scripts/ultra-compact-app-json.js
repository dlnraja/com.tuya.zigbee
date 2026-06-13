#!/usr/bin/env node
/**
 * ultra-compact-app-json.js
 * Réduit app.json au MINIMUM absolu requis par Athom pour éviter processing_failed.
 * 
 * Ce que Athom REQUIRE dans un driver:
 *   - id, name, class, capabilities, images, zigbee (avec manufacturerName + endpoints)
 * 
 * Ce que Athom N'EXIGE PAS:
 *   - connectivity, settings (si vides), energy (si non-supporté)
 *   - platforms (set par Homey lui-même)
 *   - pair (si aucun pairing custom)
 *   - Tout champ null/undefined/vide
 * 
 * Objectif: passer de 3.58MB → <2MB pour que l'archive compressée reste <20MB
 */
'use strict';
const fs = require('fs');

const BACKUP = 'app.json.pre-compact-backup';
const INPUT  = 'app.json';

const app = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const before = JSON.stringify(app).length;

// Sauvegarde
fs.writeFileSync(BACKUP, JSON.stringify(app, null, 2));

let stripped = 0;

// ── Driver-level pruning ────────────────────────────────────────────────────
for (const drv of app.drivers || []) {
  
  // 1. Remove empty arrays/objects at driver root
  for (const key of Object.keys(drv)) {
    const val = drv[key];
    if (val === null || val === undefined) { delete drv[key]; stripped++; continue; }
    if (Array.isArray(val) && val.length === 0 && key !== 'capabilities') { delete drv[key]; stripped++; continue; }
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) { 
      delete drv[key]; stripped++; continue; 
    }
  }
  
  // 2. Remove 'connectivity' if only contains empty things
  if (drv.connectivity && Array.isArray(drv.connectivity) && drv.connectivity.length === 0) {
    delete drv.connectivity; stripped++;
  }
  
  // 3. Remove 'platforms' from individual drivers (Homey sets this automatically)
  if (drv.platforms) { delete drv.platforms; stripped++; }
  
  // 4. Clean zigbee block
  if (drv.zigbee) {
    // Remove null/empty fields
    for (const k of Object.keys(drv.zigbee)) {
      const v = drv.zigbee[k];
      if (v === null || v === undefined) { delete drv.zigbee[k]; stripped++; }
      if (Array.isArray(v) && v.length === 0 && k !== 'manufacturerName') { delete drv.zigbee[k]; stripped++; }
    }
    
    // Ensure manufacturerName is array (never null)
    if (!Array.isArray(drv.zigbee.manufacturerName)) {
      drv.zigbee.manufacturerName = [drv.zigbee.manufacturerName].filter(Boolean);
    }
    drv.zigbee.manufacturerName = drv.zigbee.manufacturerName.filter(
      n => n && typeof n === 'string' && n.trim() !== ''
    );
    
    // Compact endpoints — keep only what Athom needs
    if (drv.zigbee.endpoints) {
      for (const epId of Object.keys(drv.zigbee.endpoints)) {
        const ep = drv.zigbee.endpoints[epId];
        if (ep && typeof ep === 'object') {
          // Remove empty arrays
          if (Array.isArray(ep.clusters) && ep.clusters.length === 0) delete ep.clusters;
          if (Array.isArray(ep.bindings) && ep.bindings.length === 0) delete ep.bindings;
          // Remove null values
          for (const k of Object.keys(ep)) {
            if (ep[k] === null || ep[k] === undefined) { delete ep[k]; stripped++; }
          }
        }
      }
    }
    
    // Remove 'learnMode' if empty
    if (drv.zigbee.learnMode !== undefined && !drv.zigbee.learnMode) {
      delete drv.zigbee.learnMode; stripped++;
    }
  }
  
  // 5. Clean name field — keep only required locales
  if (drv.name && typeof drv.name === 'object') {
    const locales = Object.keys(drv.name);
    // Keep only 'en' if multiple duplicates exist
    if (locales.length > 5 && drv.name.en) {
      const enName = drv.name.en;
      // Remove non-standard locales (keep en, fr, de, nl, es, it, sv, no, da, pl)
      const STANDARD = new Set(['en', 'fr', 'de', 'nl', 'es', 'it', 'sv', 'no', 'da', 'pl']);
      for (const loc of locales) {
        if (!STANDARD.has(loc)) { delete drv.name[loc]; stripped++; }
      }
    }
  }
  
  // 6. Remove 'energy' if all values are 0 or default
  if (drv.energy) {
    const e = drv.energy;
    const allZero = Object.values(e).every(v => v === 0 || v === false || v === null);
    if (allZero) { delete drv.energy; stripped++; }
  }
  
  // 7. Remove 'settings' if empty array
  if (Array.isArray(drv.settings) && drv.settings.length === 0) {
    delete drv.settings; stripped++;
  }
  
  // 8. Remove deprecated fields
  for (const deprecated of ['autodiscovery', 'version', 'sdk', 'brandColor']) {
    if (deprecated in drv) { delete drv[deprecated]; stripped++; }
  }
}

// ── App-level pruning ────────────────────────────────────────────────────────
// Remove null/empty top-level fields
for (const key of ['api', 'discovery', 'flowTokens', 'signals']) {
  if (app[key] === null || app[key] === undefined) { delete app[key]; stripped++; }
  if (app[key] && typeof app[key] === 'object' && Object.keys(app[key]).length === 0) {
    delete app[key]; stripped++;
  }
}

// ── Serialize ────────────────────────────────────────────────────────────────
const compact = JSON.stringify(app);  // No formatting
const after = compact.length;
const saved = before - after;

fs.writeFileSync(INPUT, JSON.stringify(app, null, 2));

const beforeMB = (before / 1024 / 1024).toFixed(2);
const afterMB  = (after  / 1024 / 1024).toFixed(2);

console.log(`Before: ${beforeMB}MB → After: ${afterMB}MB`);
console.log(`Saved:  ${(saved/1024).toFixed(0)}KB (${((saved/before)*100).toFixed(1)}%)`);
console.log(`Fields stripped: ${stripped}`);
console.log(`Drivers: ${(app.drivers||[]).length}`);

// Validate: no empty manufacturerName
const badMfr = (app.drivers||[]).filter(d => 
  d.zigbee && Array.isArray(d.zigbee.manufacturerName) && 
  d.zigbee.manufacturerName.some(n => !n || n.trim() === '')
);
const noMfr = (app.drivers||[]).filter(d => 
  d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0
);
const noEP = (app.drivers||[]).filter(d => d.zigbee && !d.zigbee.endpoints);

console.log(`\nValidation:`);
console.log(`  Empty MFR: ${badMfr.length} (must be 0)`);
console.log(`  No MFR: ${noMfr.length} drivers (must be 0)`);
console.log(`  No endpoints: ${noEP.length} (must be 0)`);
console.log(`  ${badMfr.length + noMfr.length + noEP.length === 0 ? '✅ ALL VALID' : '❌ ISSUES FOUND'}`);
