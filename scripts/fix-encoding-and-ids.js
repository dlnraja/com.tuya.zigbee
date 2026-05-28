'use strict';

/**
 * fix-encoding-and-ids.js
 * Fixes two root causes of Homey AggregateError:
 * 1. Latin-1/CP1252 double-encoded chars in JSON files (Ã© instead of é)
 * 2. Invalid flow card IDs with uppercase letters or other bad chars
 * 3. Fixes resetEnergyMeter -> reset_energy_meter (in app.json too)
 * 4. Removes the garbage "gangX_scene" placeholder trigger
 */

const fs = require('fs');
const path = require('path');

// --- ENCODING FIX MAP ---
// These are CP1252 bytes read as if they were UTF-8, producing garbled text
const ENCODING_MAP = [
  // Lowercase accented
  [/Ã©/g, 'é'], [/Ã¨/g, 'è'], [/Ã /g, 'à'], [/Ã¢/g, 'â'],
  [/Ã®/g, 'î'], [/Ã¹/g, 'ù'], [/Ã»/g, 'û'], [/Ã´/g, 'ô'],
  [/Ã«/g, 'ë'], [/Ã¯/g, 'ï'], [/Ã§/g, 'ç'], [/Ã¼/g, 'ü'],
  [/Ã¤/g, 'ä'], [/Ã¶/g, 'ö'], [/Ã¥/g, 'å'], [/Ãµ/g, 'õ'],
  [/Ã±/g, 'ñ'],
  // Uppercase accented
  [/Ã‰/g, 'É'], [/Ãˆ/g, 'È'], [/Ã€/g, 'À'], [/Ã‚/g, 'Â'],
  [/ÃŽ/g, 'Î'], [/Ã™/g, 'Ù'], [/Ã›/g, 'Û'],
  [/Ã‡/g, 'Ç'], [/Ãœ/g, 'Ü'], [/Ã„/g, 'Ä'], [/Ã–/g, 'Ö'],
  [/Ã…/g, 'Å'], [/Ã'/g, 'Ñ'],
  // Ô needs special care (ambiguous with Ã" which is Ó)
  // Ã" -> Ô (U+00D4)
  // Special punctuation
  [/â€™/g, '\u2019'], // right single quotation mark
  [/â€˜/g, '\u2018'], // left single quotation mark  
  [/â€"/g, '\u2013'], // en dash
  [/â€"/g, '\u2014'], // em dash
  [/Â«/g, '\u00AB'],  // «
  [/Â»/g, '\u00BB'],  // »
  [/Â°/g, '\u00B0'],  // °
  [/Â²/g, '\u00B2'],  // ²
  [/Â³/g, '\u00B3'],  // ³
  [/Âµ/g, '\u00B5'],  // µ
  [/Â·/g, '\u00B7'],  // ·
  [/Â½/g, '\u00BD'],  // ½
  [/Â¡/g, '\u00A1'],  // ¡
  [/Â¿/g, '\u00BF'],  // ¿
  [/Â /g, '\u00A0'],  // non-breaking space
];

function fixEncoding(str) {
  let result = str;
  for (const [pattern, replacement] of ENCODING_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function hasEncodingIssue(str) {
  return str.includes('Ã©') || str.includes('Ã ') || str.includes('Ã¨') ||
    str.includes('Ã¢') || str.includes('Ã®') || str.includes('Ã¹') ||
    str.includes('Ã»') || str.includes('Ã´') || str.includes('Ã«') ||
    str.includes('Ã¯') || str.includes('Ã§') || str.includes('Ã¼') ||
    str.includes('Ã‰') || str.includes('Ã‡') || str.includes('â€™') ||
    str.includes('â€"') || str.includes('Â«') || str.includes('Â»') ||
    str.includes('Â°');
}

// --- INVALID FLOW CARD IDS ---
// Known bad IDs and their fixes (rename or remove)
const BAD_FLOW_IDS = {
  // Remove placeholder (replace by null = remove from array)
  'switch_switch_2gang_gangX_scene': null,
  // Rename camelCase to snake_case
  'resetEnergyMeter': 'reset_energy_meter',
};

// --- PROCESS FILES ---
let stats = { filesScanned: 0, filesFixed: 0, encodingFixes: 0, jsonErrors: 0 };

function processJsonFile(filePath) {
  stats.filesScanned++;
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error('  READ ERROR:', filePath, e.message);
    return;
  }

  let changed = false;

  // 1. Fix encoding
  if (hasEncodingIssue(content)) {
    const fixed = fixEncoding(content);
    if (fixed !== content) {
      content = fixed;
      changed = true;
      stats.encodingFixes++;
    }
  }

  // 2. Validate JSON and fix flow card IDs if applicable
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('  JSON PARSE ERROR (after encoding fix):', filePath, e.message);
    stats.jsonErrors++;
    return;
  }

  // Fix bad flow card IDs in triggers/conditions/actions arrays
  const flowKeys = ['triggers', 'conditions', 'actions'];
  for (const key of flowKeys) {
    if (!parsed[key] || !Array.isArray(parsed[key])) continue;
    const before = parsed[key].length;
    const newArr = [];
    for (const card of parsed[key]) {
      if (!card.id) { newArr.push(card); continue; }
      if (BAD_FLOW_IDS.hasOwnProperty(card.id)) {
        const replacement = BAD_FLOW_IDS[card.id];
        if (replacement === null) {
          console.log('  REMOVED flow card:', card.id, 'from', path.basename(filePath));
          changed = true;
          // Don't push - effectively removes it
          continue;
        } else {
          console.log('  RENAMED flow card:', card.id, '->', replacement, 'in', path.basename(filePath));
          card.id = replacement;
          changed = true;
        }
      }
      newArr.push(card);
    }
    if (newArr.length !== before) {
      parsed[key] = newArr;
    } else {
      parsed[key] = newArr; // still update if renames happened
    }
  }

  if (changed) {
    try {
      const newContent = JSON.stringify(parsed, null, 2);
      fs.writeFileSync(filePath, newContent + '\n', 'utf8');
      stats.filesFixed++;
      console.log('  FIXED:', filePath.replace(process.cwd() + path.sep, ''));
    } catch (e) {
      console.error('  WRITE ERROR:', filePath, e.message);
    }
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.name.endsWith('.json')) {
      processJsonFile(fullPath);
    }
  }
}

// --- ALSO FIX app.json DIRECTLY ---
function fixAppJson() {
  const appJsonPath = path.join(process.cwd(), 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    console.log('app.json not found, skipping');
    return;
  }

  console.log('\n--- Fixing app.json ---');
  let content = fs.readFileSync(appJsonPath, 'utf8');
  let changed = false;

  // Fix encoding
  if (hasEncodingIssue(content)) {
    content = fixEncoding(content);
    changed = true;
    console.log('  Fixed encoding in app.json');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('  app.json JSON PARSE ERROR:', e.message);
    return;
  }

  // Fix bad flow card IDs in app.json flow section
  const flow = parsed.flow || {};
  for (const key of ['triggers', 'conditions', 'actions']) {
    if (!flow[key] || !Array.isArray(flow[key])) continue;
    const newArr = [];
    for (const card of flow[key]) {
      if (!card.id) { newArr.push(card); continue; }
      if (BAD_FLOW_IDS.hasOwnProperty(card.id)) {
        const replacement = BAD_FLOW_IDS[card.id];
        if (replacement === null) {
          console.log('  REMOVED from app.json flow.' + key + ':', card.id);
          changed = true;
          continue;
        } else {
          console.log('  RENAMED in app.json flow.' + key + ':', card.id, '->', replacement);
          card.id = replacement;
          changed = true;
        }
      }
      newArr.push(card);
    }
    flow[key] = newArr;
  }

  if (changed) {
    fs.writeFileSync(appJsonPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
    console.log('  app.json updated.');
  } else {
    console.log('  app.json: no changes needed.');
  }
}

// --- ALSO FIX resetEnergyMeter references in JS files ---
function fixJsFiles() {
  console.log('\n--- Checking JS files for resetEnergyMeter references ---');
  let found = 0;
  
  function scanJs(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name === 'node_modules') continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanJs(fullPath);
      } else if (item.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check for getActionCard('resetEnergyMeter') or similar
        if (content.includes("'resetEnergyMeter'") || content.includes('"resetEnergyMeter"')) {
          console.log('  JS reference to resetEnergyMeter:', fullPath.replace(process.cwd() + path.sep, ''));
          found++;
        }
      }
    }
  }
  
  ['drivers', 'lib', 'app.js'].forEach(d => {
    if (fs.existsSync(d)) scanJs(d);
  });
  
  if (found === 0) console.log('  No JS files reference resetEnergyMeter directly.');
  return found;
}

// --- MAIN ---
console.log('=== Homey AggregateError Fix Script ===');
console.log('Working directory:', process.cwd());
console.log('');

console.log('--- Processing .homeycompose ---');
processDirectory('.homeycompose');

console.log('\n--- Processing drivers ---');
processDirectory('drivers');

fixAppJson();
fixJsFiles();

console.log('\n=== SUMMARY ===');
console.log('Files scanned:', stats.filesScanned);
console.log('Files fixed:', stats.filesFixed);
console.log('Encoding fixes:', stats.encodingFixes);
console.log('JSON parse errors:', stats.jsonErrors);
console.log('');
console.log('Done! Now rebuild app.json with: npx homey app compose');
