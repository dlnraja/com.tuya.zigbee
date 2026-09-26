'use strict';
/**
 * P2749f — Flow titleFormatted must include every arg for every locale.
 * Contre quoi: Athom `homey app validate --level publish` →
 *   "Missing all args in flow.triggers[...].titleFormatted.it"
 * Blocks Auto-Publish + e2e-dashboard. Silent CI only.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const driversDir = path.join(ROOT, 'drivers');
const errors = [];

for (const dir of fs.readdirSync(driversDir)) {
  const flowPath = path.join(driversDir, dir, 'driver.flow.compose.json');
  if (!fs.existsSync(flowPath)) continue;
  let flow;
  try {
    flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
  } catch (e) {
    errors.push(`${dir}: invalid JSON (${e.message})`);
    continue;
  }
  for (const section of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[section] || []) {
      const args = (card.args || []).map((a) => a.name).filter(Boolean);
      if (!args.length || !card.titleFormatted) continue;
      for (const [lang, tf] of Object.entries(card.titleFormatted)) {
        for (const a of args) {
          if (!String(tf || '').includes(`[[${a}]]`)) {
            errors.push(`${dir}/${card.id} titleFormatted.${lang} missing [[${a}]]`);
          }
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`[flow-titleformatted-args-gate] FAIL ${errors.length} issue(s):`);
  for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
  if (errors.length > 40) console.error(`  … +${errors.length - 40} more`);
  process.exit(1);
}
console.log('[flow-titleformatted-args-gate] OK — all declared Flow args present in titleFormatted locales');
