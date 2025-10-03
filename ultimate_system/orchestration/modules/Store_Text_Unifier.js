#!/usr/bin/env node
/* Store_Text_Unifier.js
 * - Standardize store listing texts to English across app.json and drivers
 * - Keeps English as the source; removes or overwrites other locales with English
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function writeJson(p, o){ fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }

function unifyLocales(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const en = obj.en != null ? String(obj.en) : null;
  if (!en) return obj; // nothing to unify if no English
  // Option A: keep only English
  return { en };
}

// Deep localization unifier
const LANG_KEYS = new Set(['en','fr','de','nl','es','it','sv','no','da','pt','pl','ru','zh','ja','cs','sk','fi','tr','ro','hu','el','he','ar','ko','ca']);
function isLocaleObject(o){
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  return Object.keys(o).some(k => LANG_KEYS.has(k));
}
function unifyLocalesDeep(v){
  if (Array.isArray(v)) return v.map(unifyLocalesDeep);
  if (v && typeof v === 'object'){
    if (isLocaleObject(v)) return unifyLocales(v);
    const out = {};
    for (const [k,val] of Object.entries(v)) out[k] = unifyLocalesDeep(val);
    return out;
  }
  return v;
}

function main(){
  const app = readJson(APP_JSON);
  if (!app) { console.error('Cannot read app.json'); process.exit(1); }

  if (app.name && typeof app.name === 'object') app.name = unifyLocales(app.name);
  if (app.description && typeof app.description === 'object') app.description = unifyLocales(app.description);
  if (app.tags) {
    if (Array.isArray(app.tags)) {
      app.tags = { en: app.tags };
    } else if (typeof app.tags === 'object') {
      const enTags = Array.isArray(app.tags.en) ? app.tags.en : [];
      app.tags = { en: enTags };
    } else {
      app.tags = { en: [] };
    }
  }

  if (Array.isArray(app.drivers)){
    for (const d of app.drivers){
      if (d && typeof d.name === 'object') d.name = unifyLocales(d.name);
      // Optional: unify learnmode.instruction languages (keep English only if present)
      if (d.zigbee && d.zigbee.learnmode && d.zigbee.learnmode.instruction && typeof d.zigbee.learnmode.instruction === 'object'){
        d.zigbee.learnmode.instruction = unifyLocales(d.zigbee.learnmode.instruction);
      }
    }
  }

  // Deep pass to collapse any remaining localized fields
  const unifiedApp = unifyLocalesDeep(app);
  writeJson(APP_JSON, unifiedApp);
  console.log('✅ Store texts unified to English in app.json (name/description/drivers names)');

  // Unify driver.compose.json names to English only
  if (fs.existsSync(DRIVERS_DIR)){
    const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory());
    for (const entry of entries){
      const manifestPath = path.join(DRIVERS_DIR, entry.name, 'driver.compose.json');
      if (!fs.existsSync(manifestPath)) continue;
      const m = readJson(manifestPath);
      if (!m) continue;
      if (typeof m.name === 'object') {
        m.name = unifyLocales(m.name);
      } else if (typeof m.name === 'string') {
        m.name = { en: m.name };
      }
      const unifiedManifest = unifyLocalesDeep(m);
      writeJson(manifestPath, unifiedManifest);
    }
    console.log('✅ Driver manifests unified to English for display names');
  }
}

if (require.main === module) main();
