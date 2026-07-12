'use strict';
/**
 * fix_appjson_encoding_pass2.js
 * 
 * Second pass: Fix remaining 219 encoding issues in:
 * - drivers[*].maintenanceActions[*].title.fr
 * - drivers[*].zigbee.learnmode.instruction.fr
 * - Any other remaining corrupted strings
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

const ENCODING_FIXES = [
  [/é/g, 'é'], [/Ã‰/g, 'É'],
  [/è/g, 'è'], [/Ã‡/g, 'Ç'],
  [/è/g, 'è'], [/Ã€/g, 'À'],
  [/Ãª/g, 'ê'], [/ÃŠ/g, 'Ê'],
  [/Ã«/g, 'ë'], [/Ã¯/g, 'ï'],
  [/à/g, 'à'], [/Ã€/g, 'À'],
  [/â/g, 'â'], [/Ã‚/g, 'Â'],
  [/Ã´/g, 'ô'], [/Ã"/g, 'Ô'],
  [/Ã®/g, 'î'], [/ÃŽ/g, 'Î'],
  [/Ã¹/g, 'ù'], [/Ã™/g, 'Ù'],
  [/Ã»/g, 'û'], [/Ã›/g, 'Û'],
  [/Ã¼/g, 'ü'], [/Ãœ/g, 'Ü'],
  [/Ã§/g, 'ç'], [/Ã—/g, '×'],
  [/Ã±/g, 'ñ'], [/Ã¦/g, 'æ'],
  [/Å"/g, 'œ'],
  [/â€™/g, "'"], [/â€˜/g, "'"],
  [/â€œ/g, '"'], [/â€/g, '"'],
  [/â€"/g, '–'], [/â€"/g, '—'],
  [/â€¦/g, '…'], [/â€¢/g, '•'],
  [/â‚¬/g, '€'], [/â„¢/g, '™'],
  [/Â°/g, '°'], [/Â²/g, '²'], [/Â³/g, '³'],
  [/Â©/g, '©'], [/Â®/g, '®'],
  [/Â«/g, '«'], [/Â»/g, '»'],
  [/Â /g, '\u00A0'],
  // Pattern: ÃJ → MÀJ (Mise à Jour)
  [/ÃJ/g, 'àJ'],
  // Vérifier → Vérifier
  [/Vérifier/g, 'Vérifier'],
  [/MÃJ/g, 'MÀJ'],
  // Loose àfollowed by uppercase/lowercase
  [/Ã([A-Za-z])/g, (m, c) => {
    // Try to map common combos
    const map = {
      'e': 'é', 'E': 'É', 'a': 'à', 'A': 'À', 'o': 'ô', 'u': 'ù',
      'i': 'î', 'c': 'ç', 'C': 'Ç', 'n': 'ñ', 'J': 'J'
    };
    return map[c] ? map[c] : c;
  }],
  // Loose Â
  [/Â([A-Za-z])/g, '$1'],
];

function fixEncoding(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const [pattern, replacement] of ENCODING_FIXES) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    } else {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

function walkAndFix(obj, stats = { fixed: 0, total: 0 }) {
  if (typeof obj === 'string') {
    stats.total++;
    const fixed = fixEncoding(obj);
    if (fixed !== obj) { stats.fixed++; return fixed; }
    return obj;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) obj[i] = walkAndFix(obj[i], stats);
    return obj;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) obj[key] = walkAndFix(obj[key], stats);
    return obj;
  }
  return obj;
}

console.log('📦 Loading app.json...');
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

console.log('🔧 Pass 2: Full deep scan of entire app.json...');
const stats = { fixed: 0, total: 0 };
walkAndFix(appJson, stats);
console.log(`  Strings checked: ${stats.total}`);
console.log(`  Strings fixed:   ${stats.fixed}`);

// Write
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
console.log('✅ Written.');

// Verify
console.log('\n🔍 Final verification...');
const raw2 = fs.readFileSync(APP_JSON_PATH, 'utf8');
const remaining = (raw2.match(/é|è|à|Ã§|â|Ã´|Ã®|Ã»|Ã¹|Ãª|Ã«|Ã¯|Ã¼|â€™|â€œ|â€|Â©|Â°|ÃJ|MÃ|Vé/g) || []).length;
console.log(`  Remaining encoding issues: ${remaining}`);
if (remaining === 0) {
  console.log('  ✅ ZERO encoding issues remain!');
} else {
  // Show where remaining ones are
  const lines = raw2.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length && count < 10; i++) {
    if (/é|è|à|Ã§|â|Ã´|Ã®|Ã»|Ã¹|Ãª|Ã«|Ã¯|Ã¼|â€™|â€œ|â€|Â©|Â°|ÃJ|MÃ|Vé/.test(lines[i])) {
      console.log(`  L${i+1}: ${lines[i].trim().substring(0,80)}`);
      count++;
    }
  }
}
