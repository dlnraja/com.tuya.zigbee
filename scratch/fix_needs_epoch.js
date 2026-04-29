const fs = require('fs');
const path = 'drivers/sensor_climate_lcdtemphumidsensor_hybrid/device.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /get needsTuyaEpoch\(\) \{[\s\S]*?\}\s+}/       ;
// I'll use a more specific match for the closing brace if needed.
// Looking at the view output:
// 302:      mfr.includes('qoy0ekbd');
// 303:   }

content = content.replace(/get needsTuyaEpoch\(\) \{[\s\S]*? qoy0ekbd') ;\s+\}/ ,
`  get needsTuyaEpoch() {
    const mfr = getManufacturer(this);
    // v5.8.74: ALL _TZE* devices need Tuya epoch (2000), not just _TZE284
    // Z2M issue #30054: wrong epoch (1970 vs 2000) causes wrong time on ALL TS0601
    return CI.startsWithCI(mfr, '_tze200') ||
      CI.startsWithCI(mfr, '_tze204') ||
      CI.startsWithCI(mfr, '_tze284') ||
      CI.containsCI(mfr, 'vvmbj46n') ||
      CI.containsCI(mfr, 'aao6qtcs') ||
      CI.containsCI(mfr, 'znph9215') ||
      CI.containsCI(mfr, 'qoy0ekbd');
  }`);

fs.writeFileSync(path, content);
console.log('needsTuyaEpoch refactored');
