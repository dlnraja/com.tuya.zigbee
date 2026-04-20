const fs = require('fs');

// Enhance UniversalVariantManager with DP database intelligence
const variantFile = 'lib/managers/UniversalVariantManager.js';
let content = fs.readFileSync(variantFile, 'utf8');

// Add enhanced DP mapping with manufacturer context
const newMapping = `
// v6.0 Enhanced with manufacturer/device context from dp-full-analysis
const DP_CAP_MAP = {
  1: { caps: ['onoff'], type: 'bool', multi: true },
  2: { caps: ['measure_temperature', 'temperature_unit'], type: 'value', div: [1, 10, 1000], mfrDependent: true },
  3: { caps: ['measure_humidity.soil', 'measure_temperature', 'min_brightness'], type: 'value', div: [1, 10, 100, 1000], mfrDependent: true },
  4: { caps: ['measure_humidity', 'measure_battery'], type: 'value', div: [1, 10], valid: v => v >= 0 && v <= 100 },
  5: { caps: ['measure_temperature', 'hsv'], type: 'value', div: [1, 10, 1000], mfrDependent: true },
  9: { caps: ['measure_luminance'], type: 'value', mfrDependent: true },
  10: { caps: ['measure_battery'], type: 'value', div: [1, 10], valid: v => v >= 0 && v <= 100 },
  15: { caps: ['measure_battery'], type: 'value', div: [1, 10], valid: v => v >= 0 && v <= 100 },
  18: { caps: ['measure_temperature'], type: 'value', div: [1, 10] },
  19: { caps: ['measure_power'], type: 'value', div: [1, 10, 100] },
  20: { caps: ['measure_voltage', 'measure_pm25'], type: 'value', div: [1, 100] },
  21: { caps: ['measure_voc'], type: 'value', div: [1, 100] },
  22: { caps: ['measure_formaldehyde'], type: 'value', div: [100] },
  101: { caps: ['measure_humidity', 'measure_temperature'], type: 'value', div: [1, 10, 100, 1000], mfrDependent: true },
  102: { caps: ['measure_luminance'], type: 'value', div: [1, 100], mfrDependent: true },
  109: { caps: ['measure_humidity'], type: 'value', div: [1], alt: 'measure_humidity.soil' },
  112: { caps: ['measure_conductivity'], type: 'value', div: [1], alt: 'measure_ec' },
};
`;

content = content.replace(/const DP_CAP_MAP = \{[^}]+\};/s, newMapping);

fs.writeFileSync(variantFile, content);
console.log(' Enhanced UniversalVariantManager with adaptive DP mappings');
