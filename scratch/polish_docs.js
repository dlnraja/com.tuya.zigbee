const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

const REPLACEMENTS = [
  { from: /Universal Tuya/g, to: 'Tuya Unified' },
  { from: /### Hybrid/g, to: '### Unified' },
  { from: /Hybrid Driver/g, to: 'Unified Driver' },
  { from: /Hybrid Device/g, to: 'Unified Device' },
  { from: /Hybrid protocol/g, to: 'Unified protocol' },
  { from: /Hybrid mode/g, to: 'Unified mode' },
  { from: /TRUE HYBRID/g, to: 'TRUE UNIFIED' },
  { from: /\[HYBRID/g, to: '[UNIFIED' },
  { from: /\| \*\*Hybrid\*\*/g, to: '| **Unified**' },
  { from: /├──SwitchBase/g, to: '├──UnifiedSwitchBase' },
  { from: /├──SensorBase/g, to: '├──UnifiedSensorBase' },
  { from: /├──CoverBase/g, to: '├──UnifiedCoverBase' },
  { from: /├──LightBase/g, to: '├──UnifiedLightBase' },
  { from: /├──PlugBase/g, to: '├──UnifiedPlugBase' },
  { from: /├──ThermostatBase/g, to: '├──UnifiedThermostatBase' }
];

async function run() {
  console.log('🚀 Final Polish: Cleaning up remaining "Hybrid" and "Universal" strings in docs...');

  const docsDir = path.join(ROOT_DIR, 'docs');
  const ruleFiles = fs.readdirSync(path.join(docsDir, 'rules')).map(f => path.join(docsDir, 'rules', f));
  const mainDocs = ['PROJECT_INDEX.md', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md'].map(f => path.join(ROOT_DIR, f));
  
  const filesToProcess = [...ruleFiles, ...mainDocs];

  for (const fullPath of filesToProcess) {
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      for (const repl of REPLACEMENTS) {
        if (repl.from.test(content)) {
          content = content.replace(repl.from, repl.to);
          changed = true;
        }
      }

      if (changed) {
        console.log(`📝 Polishing ${path.relative(ROOT_DIR, fullPath)}`);
        fs.writeFileSync(fullPath, content);
      }
    }
  }

  console.log('✅ Documentation polished!');
}

run().catch(err => {
  console.error('❌ Polish failed:', err);
  process.exit(1);
});
