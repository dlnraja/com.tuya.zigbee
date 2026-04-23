const fs = require('fs');

// Fix duplicate keys in ManufacturerVariationManager.js
const file = 'lib/ManufacturerVariationManager.js';
let content = fs.readFileSync(file, 'utf8');

const duplicates = [
  '_TZ3000_bep7ccew', '_TZ3000_gjnozsaz', '_TZ3000_typdpbpg',
  '_TZ3000_cfnprab5', '_TZE204_ztc6ggyl', '_TZE204_sxm7l9xa',
  '_TZE200_2aaelwxk', '_TZE204_7gclukjs', '_TZE204_iaeejhvf',
  '_TZE200_bjawzodf', '_TZE200_zl1kmjqx', '_TZ3000_ug1vtuzn',
  '_TZE284_sgabhwa6', '_TZE284_aao3yzhs', '_TZ3000_mh9px7cq',
  '_TZE200_nogaemzt', '_TZE200_wmcdj3aq', '_TZE200_cowvfni3',
  '_TZE200_nv6nxo0c', '_TZE204_ijxvkhd0', '_TZE200_6rdj8dzm',
  '_TZE200_hvaxb2tc', '_TZ3000_kyb656no', '_TZ3000_kstbkt6a',
  '_TZ3000_k4ej3ww2', '_TZ3000_abaplimj', '_TZ3000_mqiev3jk',
  '_TZ3000_ocjlo4ea', '_TZ3000_upgcbody', '_TZ3000_t6jriawg',
  '_TZ3000_mugyhz0q', '_TZ3000_awvmkayh', '_TZ3000_0s9gukzt',
  '_TZE204_debczeci', '_TZ3290_jxvzqatwgsaqzx1u',
  '_TZ3290_lypnqvlem5eq1ree', '_TZ3290_nba3knpsarkawgnt'
];

let firstOccurrence = {};
let lines = content.split('\n');
let removed = 0;

for (let i = 0; i < lines.length; i++) {
  for (const dup of duplicates) {
    const regex = new RegExp(`^\\s*'${dup.replace(/[.*+? ^${}()|[\]\\]/g , '\\$&')}'\\s*:`)      ;
    if (regex.test(lines[i])) {
      if (!firstOccurrence[dup]) {
        firstOccurrence[dup] = i;
      } else {
        lines[i] = '    // DUPLICATE: ' + lines[i].trim();
        removed++;
      }
    }
  }
}

content = lines.join('\n');
fs.writeFileSync(file, content);
console.log(` Commented out ${removed} duplicate keys`);

// Fix TuyaDPDatabase.js duplicate
const dbFile = 'lib/tuya/TuyaDPDatabase.js';
let dbContent = fs.readFileSync(dbFile, 'utf8');
let dbLines = dbContent.split('\n');
let soilSensorCount = 0;
for (let i = 0; i < dbLines.length; i++) {
  if (/^\s*SOIL_SENSOR\s*:/.test(dbLines[i])) {
    soilSensorCount++;
    if (soilSensorCount > 1) {
      dbLines[i] = '  // DUPLICATE: ' + dbLines[i].trim();
    }
  }
}
fs.writeFileSync(dbFile, dbLines.join('\n'));
console.log(' Fixed TuyaDPDatabase.js duplicate');

// Fix TuyaEF00Manager.js duplicate
const efFile = 'lib/tuya/TuyaEF00Manager.js';
let efContent = fs.readFileSync(efFile, 'utf8');
let efLines = efContent.split('\n');
let rhgsbacqCount = 0;
for (let i = 0; i < efLines.length; i++) {
  if (/^\s*'_TZE200_rhgsbacq'\s*:/.test(efLines[i])) {
    rhgsbacqCount++;
    if (rhgsbacqCount > 1) {
      efLines[i] = '      // DUPLICATE: ' + efLines[i].trim();
    }
  }
}
fs.writeFileSync(efFile, efLines.join('\n'));
console.log(' Fixed TuyaEF00Manager.js duplicate');
