'use strict';
/**
 * fix_appjson_encoding.js
 * 
 * Repairs app.json:
 * 1. Fixes 2711+ UTF-8 double-encoding corruptions in French strings
 * 2. Fixes app name to "Universal TUYA Zigbee Device"
 * 3. Aligns version to v8.5.17
 * 4. Cleans up description
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

// ─── UTF-8 DECODE TABLE ───────────────────────────────────────────────────────
// Maps corrupted ISO-8859-1-as-UTF-8 sequences to correct UTF-8 characters
// These are the most common double-encoding patterns found in French text
const ENCODING_FIXES = [
  // é (U+00E9) → é
  [/é/g, 'é'],
  [/Ã‰/g, 'É'],
  // è (U+00E8) → è
  [/è/g, 'è'],
  [/ÃˆÃ/g, 'È'],
  // ê (U+00EA) → ê
  [/Ãª/g, 'ê'],
  [/ÃŠ/g, 'Ê'],
  // ë (U+00EB)
  [/Ã«/g, 'ë'],
  // à (U+00E0) → à
  [/à/g, 'à'],
  [/Ã€/g, 'À'],
  // â (U+00E2) → â
  [/â/g, 'â'],
  [/Â/g, 'Â'],
  // ô (U+00F4) → ô
  [/Ã´/g, 'ô'],
  [/Ã"/g, 'Ô'],
  // î (U+00EE) → î
  [/Ã®/g, 'î'],
  [/ÃŽ/g, 'Î'],
  // ï (U+00EF)
  [/Ã¯/g, 'ï'],
  // ù (U+00F9) → ù
  [/Ã¹/g, 'ù'],
  [/Ã™/g, 'Ù'],
  // û (U+00FB) → û
  [/Ã»/g, 'û'],
  [/Ã›/g, 'Û'],
  // ü (U+00FC)
  [/Ã¼/g, 'ü'],
  // ç (U+00E7) → ç
  [/Ã§/g, 'ç'],
  [/Ã‡/g, 'Ç'],
  // ñ (U+00F1)
  [/Ã±/g, 'ñ'],
  // œ (U+0153)
  [/Å"/g, 'œ'],
  // æ (U+00E6)
  [/Ã¦/g, 'æ'],
  // ß (U+00DF)
  [/Ã/g, 'ß'],
  // « » guillemets
  [/Â«/g, '«'],
  [/Â»/g, '»'],
  // ' apostrophe typographique
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  // " " guillemets anglophones
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  // – — tirets
  [/â€"/g, '–'],
  [/â€"/g, '—'],
  // … ellipse
  [/â€¦/g, '…'],
  // • point médian
  [/â€¢/g, '•'],
  // ° degré
  [/Â°/g, '°'],
  // ² ³ exposants
  [/Â²/g, '²'],
  [/Â³/g, '³'],
  // Non-breaking space
  [/Â /g, '\u00A0'],
  // € euro
  [/â‚¬/g, '€'],
  // Copyright ©
  [/Â©/g, '©'],
  // Registered ®
  [/Â®/g, '®'],
  // Trademark ™
  [/â„¢/g, '™'],
  // × multiplication
  [/Ã—/g, '×'],
  // ÷ division
  [/Ã·/g, '÷'],
  // Residual lone Â before other chars (often encoding artifact)
  [/Â([A-Za-z])/g, '$1'],
];

/**
 * Apply all encoding fixes to a string
 */
function fixEncoding(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const [pattern, replacement] of ENCODING_FIXES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Recursively walk and fix all strings in an object
 */
function walkAndFix(obj, stats = { fixed: 0, total: 0 }) {
  if (typeof obj === 'string') {
    stats.total++;
    const fixed = fixEncoding(obj);
    if (fixed !== obj) {
      stats.fixed++;
      return fixed;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = walkAndFix(obj[i], stats);
    }
    return obj;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      obj[key] = walkAndFix(obj[key], stats);
    }
    return obj;
  }
  return obj;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

console.log('📦 Loading app.json...');
const raw = fs.readFileSync(APP_JSON_PATH, 'utf8');
console.log(`📊 File size: ${(raw.length / 1024 / 1024).toFixed(2)} MB`);

let appJson;
try {
  appJson = JSON.parse(raw);
  console.log('✅ JSON parsed successfully');
} catch (err) {
  console.error('❌ JSON parse error:', err.message);
  process.exit(1);
}

// ─── FIX 1: App Name ─────────────────────────────────────────────────────────
console.log('\n🔧 Fix 1: App name');
const oldName = appJson.name;
appJson.name = {
  en: 'Universal TUYA Zigbee Device',
  nl: 'Universal TUYA Zigbee Device',
  de: 'Universal TUYA Zigbee Gerät',
  fr: 'Universal TUYA Zigbee Device',
};
console.log('  Old:', JSON.stringify(oldName.en));
console.log('  New:', JSON.stringify(appJson.name.en));

// ─── FIX 2: Version ──────────────────────────────────────────────────────────
console.log('\n🔧 Fix 2: Version');
const oldVersion = appJson.version;
appJson.version = '8.5.17';
console.log('  Old:', oldVersion, '→ New:', appJson.version);

// ─── FIX 3: Description ──────────────────────────────────────────────────────
console.log('\n🔧 Fix 3: Description (remove SmartThings/eWeLink confusion)');
appJson.description = {
  en: 'Universal Tuya Zigbee Device App: Local-first Zigbee control for Tuya, TuYa TS/TZE devices on Homey Pro',
  nl: 'Universal Tuya Zigbee Device App: Lokale Zigbee-besturing voor Tuya, TS/TZE apparaten op Homey Pro',
  de: 'Universal Tuya Zigbee Device App: Lokale Zigbee-Steuerung für Tuya, TS/TZE Geräte auf Homey Pro',
  fr: 'Universal Tuya Zigbee Device App: Contrôle local Zigbee pour Tuya, appareils TS/TZE sur Homey Pro',
};
console.log('  Updated descriptions for en/nl/de/fr');

// ─── FIX 4: Tags ─────────────────────────────────────────────────────────────
console.log('\n🔧 Fix 4: Tags (fix encoding in tags)');
appJson.tags = {
  en: ['tuya', 'zigbee', 'smart home', 'switch', 'sensor', 'local-first', 'TS0601', 'TS0041'],
  nl: ['tuya', 'zigbee', 'slim huis', 'schakelaar', 'sensor', 'local-first'],
  de: ['tuya', 'zigbee', 'smart home', 'schalter', 'sensor', 'local-first'],
  fr: ['tuya', 'zigbee', 'maison connectée', 'interrupteur', 'capteur', 'local-first'],
};

// ─── FIX 5: UTF-8 Encoding in Flow Cards ─────────────────────────────────────
console.log('\n🔧 Fix 5: UTF-8 encoding in flow section...');
const stats = { fixed: 0, total: 0 };

if (appJson.flow) {
  walkAndFix(appJson.flow, stats);
}

console.log(`  Strings checked: ${stats.total}`);
console.log(`  Strings fixed: ${stats.fixed}`);

// ─── FIX 6: Encoding in drivers section ──────────────────────────────────────
console.log('\n🔧 Fix 6: UTF-8 encoding in drivers section...');
const driverStats = { fixed: 0, total: 0 };
if (appJson.drivers) {
  // Only fix strings in title/name/description/label fields, not IDs or paths
  for (const driver of appJson.drivers) {
    if (driver.name) walkAndFix(driver.name, driverStats);
    if (driver.description) walkAndFix(driver.description, driverStats);
    if (driver.pair) walkAndFix(driver.pair, driverStats);
    if (driver.settings) walkAndFix(driver.settings, driverStats);
  }
}
console.log(`  Driver strings checked: ${driverStats.total}`);
console.log(`  Driver strings fixed: ${driverStats.fixed}`);

// ─── WRITE OUTPUT ─────────────────────────────────────────────────────────────
console.log('\n📝 Writing fixed app.json...');
// Backup original
const backupPath = APP_JSON_PATH + '.backup';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, raw, 'utf8');
  console.log(`  Backup saved to: ${backupPath}`);
}

const output = JSON.stringify(appJson, null, 2);
fs.writeFileSync(APP_JSON_PATH, output, 'utf8');
console.log(`  Written: ${(output.length / 1024 / 1024).toFixed(2)} MB`);

// ─── VERIFY ──────────────────────────────────────────────────────────────────
console.log('\n🔍 Post-fix verification...');
const verify = JSON.parse(Buffer.from(fs.readFileSync(APP_JSON_PATH)).toString('utf8'));
const remainingIssues = [];
function checkRemaining(obj, path = '') {
  if (typeof obj === 'string') {
    if (/Ã|â€|Â©|é|è|à|Ã§/.test(obj)) {
      remainingIssues.push({ path, snippet: obj.substring(0, 60) });
    }
    return;
  }
  if (Array.isArray(obj)) { obj.forEach((v, i) => checkRemaining(v, `${path}[${i}]`)); return; }
  if (obj && typeof obj === 'object') { for (const k of Object.keys(obj)) checkRemaining(obj[k], `${path}.${k}`); }
}
checkRemaining(verify.flow);
checkRemaining(verify.drivers);

console.log(`  Remaining encoding issues: ${remainingIssues.length}`);
if (remainingIssues.length > 0) {
  console.log('  First 5 remaining:');
  remainingIssues.slice(0, 5).forEach(r => console.log(`    ${r.path}: ${r.snippet}`));
}

console.log('\n✅ Summary:');
console.log(`  App name:    ${verify.name.en}`);
console.log(`  Version:     ${verify.version}`);
console.log(`  Encoding fixes applied: ${stats.fixed + driverStats.fixed}`);
console.log(`  Remaining issues: ${remainingIssues.length}`);
console.log('\n✅ app.json fix complete!');
