const fs = require('fs');
const path = require('path');

const targetFile = 'drivers/sensor_climate_temphumidsensor_hybrid/device.js';
const filePath = path.join(process.cwd(), targetFile);

let content = fs.readFileSync(filePath, 'utf8');

// Fix the header that was messed up by the tool
const headerFixed = `'use strict';
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

// Replace everything from start to the end of VALIDATION object
content = content.replace(/^'use strict';[\s\S]*?HUMIDITY_AUTO_DIVISOR_THRESHOLD: 100, \/\/ If value > 100, divide by 10\s*};/m, headerFixed);

// Apply CI refactors
// deviceProtocol
content = content.replace(/const mfr = \(this\._manufacturerName \|\| ''\)\.toLowerCase\(\);/g, "const mfr = getManufacturer(this);");
content = content.replace(/if \(mfr\.startsWith\('_tze284'\)\)/g, "if (CI.startsWithCI(mfr, '_tze284'))");
content = content.replace(/if \(mfr\.startsWith\('_tze200'\)\)/g, "if (CI.startsWithCI(mfr, '_tze200'))");
content = content.replace(/if \(mfr\.startsWith\('_tze204'\)\)/g, "if (CI.startsWithCI(mfr, '_tze204'))");
content = content.replace(/if \(mfr\.startsWith\('_tz3000'\)\)/g, "if (CI.startsWithCI(mfr, '_tz3000'))");
content = content.replace(/if \(mfr\.startsWith\('_tz3210'\)\)/g, "if (CI.startsWithCI(mfr, '_tz3210'))");

// modelId checks
content = content.replace(/const modelId = this\._modelId \|\| '';/g, "const modelId = getModelId(this);");
content = content.replace(/if \(modelId === 'TS0201'\)/g, "if (CI.equalsCI(modelId, 'TS0201'))");
content = content.replace(/if \(modelId === 'TS0601'\)/g, "if (CI.equalsCI(modelId, 'TS0601'))");

// needsTuyaEpoch
content = content.replace(/return mfr\.startsWith\('_tze200'\) \|\|[\s\S]*? mfr\.includes\('qoy0ekbd'\);/m, 
`return CI.startsWithCI(mfr, '_tze200') ||
      CI.startsWithCI(mfr, '_tze204') ||
      CI.startsWithCI(mfr, '_tze284') ||
      CI.containsCI(mfr, 'vvmbj46n') ||
      CI.containsCI(mfr, 'aao6qtcs') ||
      CI.containsCI(mfr, 'znph9215') ||
      CI.containsCI(mfr, 'qoy0ekbd');`);

// isLCDClimateDevice
content = content.replace(/const mfr = \(this\._manufacturerName \|\| ''\)\.toLowerCase\(\);/g, "const mfr = getManufacturer(this);"); // Already done but good for safety
content = content.replace(/if \(mfr\.startsWith\('_tze284_'\)\) return true;/g, "if (CI.startsWithCI(mfr, '_tze284_')) return true;");
content = content.replace(/if \(mfr\.includes\(lcdMfr\)\) return true;/g, "if (CI.containsCI(mfr, lcdMfr)) return true;");
content = content.replace(/if \(modelId === 'TS0601' && mfr\.startsWith\('_tze284_'\)\) return true;/g, "if (CI.equalsCI(modelId, 'TS0601') && CI.startsWithCI(mfr, '_tze284_')) return true;");

// usesBatteryStateEnum
content = content.replace(/return mfr\.includes\('_tze200_vvmbj46n'\);/g, "return CI.containsCI(mfr, '_tze200_vvmbj46n');");

// onNodeInit dedup check
content = content.replace(/const mfr = \(this\.getSetting\('zb_manufacturer_name'\) \|\| ''\)\.toLowerCase\(\ );/g, "const mfr = getManufacturer(this);");
content = content.replace(/const isPureZCL = mfr\.startsWith\('_tz3000_'\) \|\| mfr\.startsWith\('_tz3210_'\) \|\|[\s\S]*? mfr\.startsWith\('owon'\);/m ,
`const isPureZCL = CI.startsWithCI(mfr, '_tz3000_') || CI.startsWithCI(mfr, '_tz3210_') ||
                        CI.startsWithCI(mfr, '_tz6210_') || CI.startsWithCI(mfr, 'owon');`);

fs.writeFileSync(filePath, content);
console.log('Successfully refactored sensor_climate_temphumidsensor_hybrid/device.js');
