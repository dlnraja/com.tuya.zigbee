const fs = require('fs');
const path = 'drivers/sensor_climate_lcdtemphumidsensor_hybrid/device.js';
let content = fs.readFileSync(path, 'utf8');

// Refactor deviceProtocol
content = content.replace(/get deviceProtocol\(\) \{[\s\S]*? return 'HYBRID'  ; \/\/ Default: try both\s+}/, 
`  get deviceProtocol() {
    const mfr = getManufacturer(this);

    if (CI.startsWithCI(mfr, '_tze284')) return 'TUYA_DP_LCD';      // LCD with Tuya epoch
    if (CI.startsWithCI(mfr, '_tze200')) return 'TUYA_DP';          // Standard Tuya DP
    if (CI.startsWithCI(mfr, '_tze204')) return 'TUYA_DP_ENHANCED'; // Enhanced Tuya DP
    if (CI.startsWithCI(mfr, '_tz3000')) return 'ZCL_STANDARD';     // Pure ZCL
    if (CI.startsWithCI(mfr, '_tz3210')) return 'ZCL_STANDARD';     // Pure ZCL

    // Check modelId for protocol hints
    const modelId = this._modelId || '';
    if (CI.equalsCI(modelId, 'TS0201')) return 'ZCL_STANDARD';
    if (CI.equalsCI(modelId, 'TS0601')) return 'TUYA_DP';

    return 'HYBRID'; // Default: try both
  }`);

// Refactor needsTuyaEpoch
content = content.replace(/get needsTuyaEpoch\(\) \{[\s\S]*?qoy0ekbd' ;\s+}/,
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

// Refactor isLCDClimateDevice
content = content.replace(/isLCDClimateDevice\(\) \{[\s\S]*? return false ;\s+}/ ,
`  isLCDClimateDevice() {
    const mfr = getManufacturer(this);
    const modelId = this._modelId || '';

    // _TZE284_ series are LCD climate sensors with RTC displays
    if (CI.startsWithCI(mfr, '_tze284_')) return true;

    // Known LCD climate sensor manufacturer IDs
    const lcdManufacturers = [
      '_tze284_vvmbj46n',  // TH05Z LCD climate sensor (MAIN TARGET)
      '_tze284_aao6qtcs',  // Similar LCD model
      '_tze284_znph9215',  // Another LCD variant
      '_tze284_qoy0ekbd',  // LCD climate sensor
      '_tze200_vvmbj46n',  // Some TZE200 also have LCD
    ];

    // Check if manufacturer matches known LCD devices
    if (lcdManufacturers.some(lcdMfr => CI.containsCI(mfr, lcdMfr))) return true;

    // TS0601 with LCD indicators (some have LCD displays)
    if (CI.equalsCI(modelId, 'TS0601') && CI.startsWithCI(mfr, '_tze284_')) return true;

    return false;
  }`);

// Refactor usesBatteryStateEnum
content = content.replace(/get usesBatteryStateEnum\(\) \{[\s\S]*? return mfr\.includes\('_tze200_vvmbj46n'\) ; \/\/ TH05Z original uses DP3\s+}/ ,
`  get usesBatteryStateEnum() {
    const mfr = getManufacturer(this );
    // Some _TZE200 devices use DP3 with enum (low / medium/high)
    return CI.containsCI(mfr, '_tze200_vvmbj46n'); // TH05Z original uses DP3
  }`);

// Refactor _isSoilSensor
content = content.replace(/_isSoilSensor\(\) \{[\s\S]*? '_tze200_2se8efxh'\]\.some\(s => mfr\.includes\(s\)\) ;\s+}/ ,
`  _isSoilSensor() {
    const mfr = getManufacturer(this);
    return ['_tze284_oitavov2', '_tze200_myd45weu', '_tze200_ga1maeof',
      '_tze200_9cqcpkgb', '_tze204_myd45weu', '_tze284_myd45weu',
      '_tze200_2se8efxh'].some(s => CI.containsCI(mfr, s));
  }`);

// Refactor _handleDP line 1481
content = content.replace(/if \(\(this\._manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('_tze284'\)\) \{/,
`    if (CI.containsCI(getManufacturer(this), '_tze284')) {`);

// Refactor onNodeInit (probe dedup)
content = content.replace(/const mfr = \(this\.getSetting\('zb_manufacturer_name'\) \|\| ''\)\.toLowerCase\(\);\s+const isPureZCL = mfr.startsWith\('_tz3000_'\) \|\| mfr.startsWith\('_tz3210_'\) \|\|/,
`      const mfr = getManufacturer(this) || this.getSetting('zb_manufacturer_name');
      const isPureZCL = CI.startsWithCI(mfr, '_tz3000_') || CI.startsWithCI(mfr, '_tz3210_') ||`);

fs.writeFileSync(path, content);
console.log('Refactor complete');
