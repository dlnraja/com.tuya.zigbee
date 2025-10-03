#!/usr/bin/env node
/* Store_Text_Unifier.js
 * - Standardize store listing texts to English across app.json and drivers
 * - Keeps English as the source; removes or overwrites other locales with English
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const APP_JSON = path.join(ROOT, 'app.json');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function writeJson(p, o){ fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }

function unifyLocales(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const en = obj.en != null ? String(obj.en) : null;
  if (!en) return obj; // nothing to unify if no English
  // Option A: keep only English
  return { en };
}

function main(){
  const app = readJson(APP_JSON);
  if (!app) { console.error('Cannot read app.json'); process.exit(1); }

  if (app.name && typeof app.name === 'object') app.name = unifyLocales(app.name);
  if (app.description && typeof app.description === 'object') app.description = unifyLocales(app.description);

  if (Array.isArray(app.drivers)){
    for (const d of app.drivers){
      if (d && typeof d.name === 'object') d.name = unifyLocales(d.name);
      // Optional: unify learnmode.instruction languages (keep English only if present)
      if (d.zigbee && d.zigbee.learnmode && d.zigbee.learnmode.instruction && typeof d.zigbee.learnmode.instruction === 'object'){
        d.zigbee.learnmode.instruction = unifyLocales(d.zigbee.learnmode.instruction);
      }
    }
  }

  writeJson(APP_JSON, app);
  console.log('✅ Store texts unified to English in app.json (name/description/drivers names)');
}

if (require.main === module) main();
