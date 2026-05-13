const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

const BASE_FILES = [
  { file: 'lib/devices/UnifiedCoverBase.js', oldClass: 'CoverBase', newClass: 'UnifiedCoverBase' },
  { file: 'lib/devices/UnifiedLightBase.js', oldClass: 'LightBase', newClass: 'UnifiedLightBase' },
  { file: 'lib/devices/UnifiedPlugBase.js', oldClass: 'PlugBase', newClass: 'UnifiedPlugBase' },
  { file: 'lib/devices/UnifiedSensorBase.js', oldClass: 'SensorBase', newClass: 'UnifiedSensorBase' },
  { file: 'lib/devices/UnifiedSwitchBase.js', oldClass: 'SwitchBase', newClass: 'UnifiedSwitchBase' },
  { file: 'lib/devices/UnifiedThermostatBase.js', oldClass: 'ThermostatBase', newClass: 'UnifiedThermostatBase' },
  { file: 'lib/devices/BaseUnifiedDevice.js', oldClass: 'BaseHybridDevice', newClass: 'BaseUnifiedDevice' },
  { file: 'lib/devices/TuyaUnifiedDevice.js', oldClass: 'TuyaHybridDevice', newClass: 'TuyaUnifiedDevice' }
];

async function run() {
  console.log('🚀 Updating Base Class names and exports...');

  for (const item of BASE_FILES) {
    const fullPath = path.join(ROOT_DIR, item.file);
    if (fs.existsSync(fullPath)) {
      console.log(`📝 Updating class in ${item.file}`);
      let content = fs.readFileSync(fullPath, 'utf8');

      // Replace class definition
      content = content.replace(`class ${item.oldClass}`, `class ${item.newClass}`);
      
      // Replace constructor/super calls if any (usually just class name)
      // Actually replace all occurrences of oldClass in the file
      const oldClassRegex = new RegExp(`\\b${item.oldClass}\\b`, 'g');
      content = content.replace(oldClassRegex, item.newClass);

      // Update exports
      const exportRegex = new RegExp(`module\\.exports\\s*=\\s*${item.newClass};`, 'g');
      if (exportRegex.test(content)) {
        content = content.replace(exportRegex, `${item.newClass}.${item.newClass} = ${item.newClass};\nmodule.exports = ${item.newClass};`);
      } else {
        // Fallback if formatting is different
        content = content.replace(/module\.exports\s*=\s*.+;/, `${item.newClass}.${item.newClass} = ${item.newClass};\nmodule.exports = ${item.newClass};`);
      }

      fs.writeFileSync(fullPath, content);
    }
  }

  console.log('✅ Base classes updated!');
}

run().catch(err => {
  console.error('❌ Update failed:', err);
  process.exit(1);
});
