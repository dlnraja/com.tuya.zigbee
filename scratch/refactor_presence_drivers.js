const fs = require('fs');
const path = require('path');

const targets = [
  'drivers/sensor_climate_presence_hybrid/device.js',
  'drivers/presence_sensor_radar/device.js',
  'drivers/air_purifier_presence_hybrid/device.js',
  'drivers/presence_sensor_ceiling/device.js',
  'drivers/sensor_presence_radar_hybrid/device.js',
  'drivers/device_air_purifier_presence_hybrid/device.js',
  'drivers/sensor_contact_presence_hybrid/device.js',
  'drivers/sensor_gas_presence_hybrid/device.js',
  'drivers/sensor_motion_presence_hybrid/device.js'
];

targets.forEach(target => {
  const filePath = path.join(process.cwd(), target);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${target}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add Imports
  if (!content.includes('CaseInsensitiveMatcher')) {
    const importLines = "const CI = require('../../lib/utils/CaseInsensitiveMatcher');\r\n" +
                        "const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');\r\n";
    content = content.replace(/'use strict';/, "'use strict';\r\n" + importLines);
  }

  // 2. Case-insensitive replacements
  // HOBEIAN check
  content = content.replace(/\(manufacturerName \|\| ''\)\.toUpperCase\(\) === '([^']+)'/g, "CI.equalsCI(manufacturerName, '$1')");
  
  // modelId check
  content = content.replace(/modelId === '([^']+)'/g, "CI.equalsCI(modelId, '$1')");
  
  // manufacturerName lookup cleanup
  content = content.replace(/const mfrKey = manufacturerName\? \.toLowerCase\(\ ) \|\| '' ;/g, "const mfrKey = (manufacturerName || '').toLowerCase();");

  // 3. Includes/Contains
  // Positive
  content = content.replace(/\(manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('([^']+)'\)/g, "CI.containsCI(manufacturerName, '$1')");
  content = content.replace(/manufacturerName\? \.toLowerCase\(\)\.includes\('([^']+)'\)/g, "CI.containsCI(manufacturerName, '$1')" : null)       ;
  content = content.replace(/manufacturerName\.toLowerCase\(\)\.includes\('([^']+)'\)/g, "CI.containsCI(manufacturerName, '$1')");
  
  // Negative (CRITICAL: Escape the parenthesis)
  content = content.replace(/!\(manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('([^']+)'\)/g, "!CI.containsCI(manufacturerName, '$1')");
  content = content.replace(/!\(manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\(\'([^']+)\'\)/g, "!CI.containsCI(manufacturerName, '$1')");

  // 4. Presence patterns cleanup
  content = content.replace(/const mfrLower = \(manufacturerName \|\| ''\)\.toLowerCase\(\);/g, "");
  content = content.replace(/const mfrLower = manufacturerName\.toLowerCase\(\);/g, "");
  
  // isZYM100Series block
  const zymPattern = /const isZYM100Series = mfrLower\.includes\('iadro9bf'\)\s+\|\|\s+mfrLower\.includes\('gkfbdvyx'\)\s+\|\|\s+mfrLower\.includes\('qasjif9e'\)\s+\|\|\s+mfrLower\.includes\('sxm7l9xa'\);/g;
  content = content.replace(zymPattern, "const isZYM100Series = CI.containsCI(manufacturerName, ['iadro9bf', 'gkfbdvyx', 'qasjif9e', 'sxm7l9xa']);");

  // isIadro9bf
  content = content.replace(/const isIadro9bf = \(manufacturerName \|\| ''\)\.toLowerCase\(\)\.includes\('iadro9bf'\);/g, "const isIadro9bf = CI.containsCI(manufacturerName, 'iadro9bf');");

  // 5. Class Methodology Simplification
  const mfrMethodRegex = /_getManufacturerName\(\) \{[\s\S]*? return mfr \|\| '' ;\s*\}/gs ;
  content = content.replace(mfrMethodRegex, "  _getManufacturerName() {\n    return getManufacturer(this);\n  }");

  const modelIdBlockRegex = /const modelId = settings\.zb_model_id[\s\S]*?\|\| null ;/gs;
  content = content.replace(modelIdBlockRegex, "const modelId = getModelId(this);");

  // 6. Fix any residual manual lowercasing in common functions
  content = content.replace(/if \(!deviceId \|\| !CI\.containsCI\(manufacturerName, 'gkfbdvyx'\)\) \{/g, "if (!deviceId || !CI.containsCI(manufacturerName, 'gkfbdvyx')) {");

  fs.writeFileSync(filePath, content);
  console.log(`Refactored ${target}`);
});
