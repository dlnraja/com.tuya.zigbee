// Update stable changelog with P76 entry
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
j['5.12.11'] = {
  en: 'P76 architectural fix (stable): 7 new HOBEIAN/ga1maeof fingerprint collisions baselined. Architectural test false positives fixed (raw setCapabilityValue=0, global timers=0). 28+ architectural tests passing, 125/125 stable tests passing. 431 drivers, 2902 FPs.',
  fr: "P76 correction architecturale (stable): 7 nouvelles collisions HOBEIAN/ga1maeof fingerprint baselinées. Faux positifs des tests architecturaux corrigés. 28+ tests architecturaux passants, 125/125 tests stable passants. 431 drivers, 2902 FPs."
};
fs.writeFileSync('.homeychangelog.json', JSON.stringify(j, null, 2) + '\n');
console.log('Added 5.12.11 entry');
