
const fs = require('fs');
const path = require('path');

const files = [
  'drivers/presence_sensor_radar/device.js',
  'drivers/sensor_presence_radar_hybrid/device.js',
  'drivers/sensor_motion_presence_hybrid/device.js'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // 1. Refactor reach match lookup
  // Search for:
  //   const mfrKey = (manufacturerName || '').toLowerCase();
  //   if (MANUFACTURER_CONFIG_MAP[mfrKey]) {
  //     return MANUFACTURER_CONFIG_MAP[mfrKey];
  //   }
  const lookupRegex = /const mfrKey = \(manufacturerName \|\| ''\)\.toLowerCase\(\);\s+if \(MANUFACTURER_CONFIG_MAP\[mfrKey\]\) \{\s+return MANUFACTURER_CONFIG_MAP\[mfrKey\];\s+\}/g;
  content = content.replace(lookupRegex, 'const config = MANUFACTURER_CONFIG_MAP[CI.normalize(manufacturerName)];\n  if (config) return config;');

  // 2. Refactor pattern matching
  // Search for the iadro9bf block
  // v5.5.286: Pattern matching for TZE284_iadro9bf variants
  // Ronny report: manufacturerName can be empty or slightly different
  // if (manufacturerName) {
  //    ...
  //    // Match TZE284/TZE204 iadro9bf variants (presence inversion needed)
  //    if (mfrLower.includes('iadro9bf') || mfrLower.includes('qasjif9e') ||
  //      mfrLower.includes('ztqnh5cg') || mfrLower.includes('sbyx0lm6')) {
  //      console.log(`[RADAR]  Pattern match: ${manufacturerName}  TZE284_IADRO9BF config`);
  //      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF' };
  //    }
  // }
  
  const patternRegex = /if \(manufacturerName\) \{\s+\/\/ Match TZE284\/TZE204 iadro9bf variants \(presence inversion needed\)\s+if \(mfrLower\.includes\('iadro9bf'\) \|\| mfrLower\.includes\('qasjif9e'\) \|\|\s+mfrLower\.includes\('ztqnh5cg'\) \|\| mfrLower\.includes\('sbyx0lm6'\)\) \{/g;
  
  // Note: One more variation seen in view_file: there were extra empty lines and icon in console.log
  // And [RADAR] vs [RADAR] ðŸ”
  
  // Let's use a more flexible regex for pattern matching
  const flexiblePatternRegex = /if \(manufacturerName\) \{\s+(\/\/.*\s+)*if \(mfrLower\.includes\('iadro9bf'\) \|\| mfrLower\.includes\('qasjif9e'\) \|\|\s+mfrLower\.includes\('ztqnh5cg'\) \|\| mfrLower\.includes\('sbyx0lm6'\)\) \{/g;

  content = content.replace(flexiblePatternRegex, (match) => {
    return `if (manufacturerName) {
    const knownVariants = ['iadro9bf', 'qasjif9e', 'ztqnh5cg', 'sbyx0lm6'];
    if (knownVariants.some(variant => CI.containsCI(manufacturerName, variant))) {`;
  });

  fs.writeFileSync(fullPath, content);
  console.log(`Updated ${file}`);
});
