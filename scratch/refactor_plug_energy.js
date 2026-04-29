const fs = require('fs');
const path = require('path');

const files = [
  'drivers/plug_energy_monitor_hybrid/device.js'
];

const header = `'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const TuyaTimeManager = require('../../lib/TuyaTimeManager');
const TuyaDeviceClassifier = require('../../lib/TuyaDeviceClassifier');
const TuyaEpochDetector = require('../../lib/TuyaEpochDetector');
const TuyaTimeDebugProbe = require('../../lib/TuyaTimeDebugProbe');
const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
const TuyaRtcDetector = require('../../lib/TuyaRtcDetector');
const { syncDeviceTimeTuya } = require('../../lib/tuya/TuyaTimeSync');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
const { setupSonoffSensor, handleSonoffSensorSettings } = require('../../lib/mixins/SonoffSensorMixin');
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');

// 
// v5.5.793: VALIDATION CONSTANTS - Centralized thresholds for data validation
// 
const VALIDATION = {
  TEMP_MIN: -40,
  TEMP_MAX: 80,
  HUMIDITY_MIN: 0,
  HUMIDITY_MAX: 100,
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
  LUX_MIN: 0,
  LUX_MAX: 100000,
  HUMIDITY_AUTO_DIVISOR_THRESHOLD: 100, // If value > 100, divide by 10
};`;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file: ${file}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix header and validation
  content = content.replace(/^'use strict';[\s\S]*?HUMIDITY_AUTO_DIVISOR_THRESHOLD: 100, \/\/ If value > 100, divide by 10\s*};/m, header);

  // deviceProtocol refactor
  content = content.replace(/const mfr = \(this\._manufacturerName \|\| ''\)\.toLowerCase\(\);/g, "const mfr = getManufacturer(this);");
  content = content.replace(/if \(mfr\.startsWith\('_tze284'\)\)/g, "if (CI.startsWithCI(mfr, '_tze284'))");
  content = content.replace(/if \(mfr\.startsWith\('_tze200'\)\)/g, "if (CI.startsWithCI(mfr, '_tze200'))");
  content = content.replace(/if \(mfr\.startsWith\('_tze204'\)\)/g, "if (CI.startsWithCI(mfr, '_tze204'))");
  content = content.replace(/if \(mfr\.startsWith\('_tz3000'\)\)/g, "if (CI.startsWithCI(mfr, '_tz3000'))");
  content = content.replace(/if \(mfr\.startsWith\('_tz3210'\)\)/g, "if (CI.startsWithCI(mfr, '_tz3210'))");
  
  content = content.replace(/const modelId = this\._modelId \|\| '';/g, "const modelId = getModelId(this);");
  content = content.replace(/if \(modelId === 'TS0201'\)/g, "if (CI.equalsCI(modelId, 'TS0201'))");
  content = content.replace(/if \(modelId === 'TS0601'\)/g, "if (CI.equalsCI(modelId, 'TS0601'))");

  // needsTuyaEpoch refactor
  content = content.replace(/return mfr\.startsWith\('_tze200'\) \|\|[\s\S]*? mfr\.includes\('qoy0ekbd'\);/m, 
`return CI.startsWithCI(mfr, '_tze200') ||
      CI.startsWithCI(mfr, '_tze204') ||
      CI.startsWithCI(mfr, '_tze284') ||
      CI.containsCI(mfr, 'vvmbj46n') ||
      CI.containsCI(mfr, 'aao6qtcs') ||
      CI.containsCI(mfr, 'znph9215') ||
      CI.containsCI(mfr, 'qoy0ekbd');`);

  // isLCDClimateDevice refactor
  content = content.replace(/if \(mfr\.startsWith\('_tze284_'\)\) return true;/g, "if (CI.startsWithCI(mfr, '_tze284_')) return true;");
  content = content.replace(/if \(mfr\.includes\(lcdMfr\)\) return true;/g, "if (CI.containsCI(mfr, lcdMfr)) return true;");
  content = content.replace(/if \(modelId === 'TS0601' && mfr\.startsWith\('_tze284_'\)\) return true;/g, "if (CI.equalsCI(modelId, 'TS0601') && CI.startsWithCI(mfr, '_tze284_')) return true;");

  // usesBatteryStateEnum refactor
  content = content.replace(/return mfr\.includes\('_tze200_vvmbj46n'\);/g, "return CI.containsCI(mfr, '_tze200_vvmbj46n');");

  fs.writeFileSync(filePath, content);
  console.log(`Refactored ${file}`);
});
