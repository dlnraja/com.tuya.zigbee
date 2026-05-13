const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

const REPLACEMENTS = [
  { from: /Tuya Unified/g, to: 'Tuya Unified' },
  { from: /TuyaUnified/g, to: 'TuyaUnified' },
  { from: /UnifiedSwitchBase/g, to: 'UnifiedSwitchBase' },
  { from: /UnifiedSensorBase/g, to: 'UnifiedSensorBase' },
  { from: /UnifiedPlugBase/g, to: 'UnifiedPlugBase' },
  { from: /UnifiedLightBase/g, to: 'UnifiedLightBase' },
  { from: /UnifiedCoverBase/g, to: 'UnifiedCoverBase' },
  { from: /UnifiedThermostatBase/g, to: 'UnifiedThermostatBase' },
  { from: /BaseUnifiedDevice/g, to: 'BaseUnifiedDevice' },
  { from: /TuyaUnifiedDevice/g, to: 'TuyaUnifiedDevice' },
  { from: /"Tuya Unified Zigbee"/g, to: '"Tuya Unified Zigbee"' },
  { from: /"Tuya Unified"/g, to: '"Tuya Unified"' }
];

const FILE_RENAMES = [
  { from: 'lib/devices/UnifiedCoverBase.js', to: 'lib/devices/UnifiedCoverBase.js' },
  { from: 'lib/devices/UnifiedLightBase.js', to: 'lib/devices/UnifiedLightBase.js' },
  { from: 'lib/devices/UnifiedPlugBase.js', to: 'lib/devices/UnifiedPlugBase.js' },
  { from: 'lib/devices/UnifiedSensorBase.js', to: 'lib/devices/UnifiedSensorBase.js' },
  { from: 'lib/devices/UnifiedSwitchBase.js', to: 'lib/devices/UnifiedSwitchBase.js' },
  { from: 'lib/devices/UnifiedThermostatBase.js', to: 'lib/devices/UnifiedThermostatBase.js' },
  { from: 'lib/devices/BaseUnifiedDevice.js', to: 'lib/devices/BaseUnifiedDevice.js' },
  { from: 'lib/devices/TuyaUnifiedDevice.js', to: 'lib/devices/TuyaUnifiedDevice.js' }
];

async function run() {
  console.log('🚀 Starting Universal to Unified Branding Refactor...');

  // 1. Rename files
  for (const rename of FILE_RENAMES) {
    const fromPath = path.join(ROOT_DIR, rename.from);
    const toPath = path.join(ROOT_DIR, rename.to);
    if (fs.existsSync(fromPath)) {
      console.log(`📦 Renaming ${rename.from} to ${rename.to}`);
      fs.renameSync(fromPath, toPath);
    }
  }

  // 2. Global Search and Replace
  const extensions = ['.js', '.json', '.md', '.html', '.svg', '.yml'];
  const excludeDirs = ['node_modules', '.git', 'tmp', 'data/temp_desktop_cleanup'];

  function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!excludeDirs.includes(file)) {
          processDir(fullPath);
        }
      } else {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          let content = fs.readFileSync(fullPath, 'utf8');
          let changed = false;

          for (const repl of REPLACEMENTS) {
            if (repl.from.test(content)) {
              content = content.replace(repl.from, repl.to);
              changed = true;
            }
          }

          if (changed) {
            console.log(`📝 Updating ${path.relative(ROOT_DIR, fullPath)}`);
            fs.writeFileSync(fullPath, content);
          }
        }
      }
    }
  }

  processDir(ROOT_DIR);

  console.log('✅ Branding refactor complete!');
}

run().catch(err => {
  console.error('❌ Refactor failed:', err);
  process.exit(1);
});
