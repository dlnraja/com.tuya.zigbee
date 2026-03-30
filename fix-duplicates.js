const fs = require('fs');

// Fix duplicate keys in ManufacturerVariationManager.js
const file = 'lib/managers/ManufacturerVariationManager.js';
let content = fs.readFileSync(file, 'utf8');

// Remove duplicate entries by keeping first occurrence
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

let lineNum = 0;
let firstOccurrence = {};
let lines = content.split('\n');
let removed = 0;

for (let i = 0; i < lines.length; i++) {
  for (const dup of duplicates) {
    if (lines[i].includes(`'${dup}'`) && lines[i].includes(':')) {
      if (!firstOccurrence[dup]) {
        firstOccurrence[dup] = i;
      } else {
        // This is a duplicate - comment it out
        lines[i] = '    // DUPLICATE REMOVED: ' + lines[i].trim();
        removed++;
      }
    }
  }
}

content = lines.join('\n');
fs.writeFileSync(file, content);
console.log(`✅ Fixed ${removed} duplicate keys in ManufacturerVariationManager.js`);
