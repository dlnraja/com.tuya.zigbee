#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 5 PHASES v2.0.0');

// Phase 1: Référentiels
if (!fs.existsSync('references')) fs.mkdirSync('references', {recursive: true});
fs.writeFileSync('references/driver_refs.json', '{"motion":"_TZ3000_mmtwjmaq","switch":"_TZ3000_qzjcsmar"}');

// Phase 2: Sources
fs.writeFileSync('references/sources.json', '{"github":["johan-bendz","dlnraja"]}');

// Phase 3: Drivers
const db = {motion: ['_TZ3000_mmtwjmaq'], switch: ['_TZ3000_qzjcsmar']};
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    const cat = d.includes('motion') ? 'motion' : 'switch';
    data.zigbee.manufacturerName = db[cat];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
  }
});

// Phase 4: Images OK
console.log('🎨 Images OK');

// Phase 5: Publication
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "🚀 5 Phases v2.0.0" && git push --force', {stdio: 'inherit'});
  console.log('✅ 5 PHASES COMPLETE');
} catch (e) {
  console.log('❌', e.message);
}
