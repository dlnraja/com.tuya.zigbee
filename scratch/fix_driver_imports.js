const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

const MAPPINGS = [
  { file: 'UnifiedSwitchBase', class: 'UnifiedSwitchBase' },
  { file: 'UnifiedSensorBase', class: 'UnifiedSensorBase' },
  { file: 'UnifiedPlugBase', class: 'UnifiedPlugBase' },
  { file: 'UnifiedLightBase', class: 'UnifiedLightBase' },
  { file: 'UnifiedCoverBase', class: 'UnifiedCoverBase' },
  { file: 'UnifiedThermostatBase', class: 'UnifiedThermostatBase' },
  { file: 'BaseUnifiedDevice', class: 'BaseUnifiedDevice' },
  { file: 'TuyaUnifiedDevice', class: 'TuyaUnifiedDevice' }
];

async function run() {
  console.log('🚀 Fixing Driver Imports and Normalizing Base Class usage...');

  const driversDir = path.join(ROOT_DIR, 'drivers');
  const drivers = fs.readdirSync(driversDir);

  for (const driver of drivers) {
    const deviceJsPath = path.join(driversDir, driver, 'device.js');
    if (fs.existsSync(deviceJsPath)) {
      console.log(`📝 Processing ${driver}/device.js`);
      let content = fs.readFileSync(deviceJsPath, 'utf8');
      let changed = false;

      // 1. Fix the constSwitchBase typo
      if (content.includes('constSwitchBase')) {
        console.log(`   ✨ Fixing constSwitchBase typo in ${driver}`);
        content = content.replace(/constSwitchBase\s*=/g, 'const UnifiedSwitchBase =');
        changed = true;
      }

      // 2. Normalize imports for all base classes
      for (const mapping of MAPPINGS) {
        const requireRegex = new RegExp(`const\\s+\\w+\\s*=\\s*require\\(['"]\\.\\.\\/\\.\\.\\/lib\\/devices\\/${mapping.file}['"]\\);?`, 'g');
        if (requireRegex.test(content)) {
          // If it's already assigned to something else, we should probably leave it or rename it.
          // But my branding refactor already renamed the usage in 'extends'.
          // So we MUST assign it to the name used in 'extends'.
          content = content.replace(requireRegex, `const ${mapping.class} = require('../../lib/devices/${mapping.file}');`);
          changed = true;
        }
        
        // Handle the weird try/catch block in switch_4gang
        if (driver === 'switch_4gang' || driver === 'switch_3gang') {
            content = content.replace(/letSwitchBase;/g, `let ${mapping.class};`);
            content = content.replace(/SwitchBase\s*=\s*require/g, `${mapping.class} = require`);
            content = content.replace(/if\s*\(!HybridSwitchBase\)/g, `if (!${mapping.class})`);
            content = content.replace(/if\s*\(!UnifiedSwitchBase\)/g, `if (!${mapping.class})`);
            content = content.replace(/SwitchBase\s*=\s*ZigBeeDevice/g, `${mapping.class} = ZigBeeDevice`);
            content = content.replace(/typeofSwitchBase/g, `typeof ${mapping.class}`);
            content = content.replace(/:SwitchBase/g, `:${mapping.class}`);
            changed = true;
        }
      }

      // 3. Ensure the class extension uses the correct base class
      // (This was mostly done by the branding refactor, but let's be sure)
      
      if (changed) {
        fs.writeFileSync(deviceJsPath, content);
      }
    }
  }

  console.log('✅ Driver imports fixed!');
}

run().catch(err => {
  console.error('❌ Fix failed:', err);
  process.exit(1);
});
