const fs = require('fs');
const path = 'drivers/sensor_climate_lcdtemphumidsensor_hybrid/device.js';
let content = fs.readFileSync(path, 'utf8');

// Refactor needsTuyaEpoch
const needsTuyaEpochRegex = /get needsTuyaEpoch\(\) \{[\s\S]*? get needsTuyaEpoch\(\ ) \{[\s\S]*? return mfr\.startsWith\('_tze200'\ )[\s\S]*?qoy0ekbd' ;\s+}/;
// Wait, I see the issue. I'll just use the exact string if I can.
content = content.replace(/get needsTuyaEpoch\(\) \{[\s\S]*? return mfr\.startsWith\('_tze200'\ )[\s\S]*?qoy0ekbd' ;\s+}/,
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

// Refactor handleDP more carefully
content = content.replace(/if \(\(this\._manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('_tze284'\)\)/,
`    if (CI.containsCI(getManufacturer(this), '_tze284'))`);

// Refactor the ZCL check in onNodeInit
content = content.replace(/const isPureZCL = CI.startsWithCI\(mfr, '_tz3000_'\) \|\| CI.startsWithCI\(mfr, '_tz3210_'\) \|\|\s+mfr.startsWith\('_tz6210_'\) \|\| mfr.startsWith\('owon'\);/,
`      const isPureZCL = CI.startsWithCI(mfr, '_tz3000_') || CI.startsWithCI(mfr, '_tz3210_') ||
                        CI.startsWithCI(mfr, '_tz6210_') || CI.startsWithCI(mfr, 'owon');`);

fs.writeFileSync(path, content);
console.log('Refactor pass 2 complete');
