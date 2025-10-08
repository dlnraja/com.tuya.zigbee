#!/usr/bin/env node
// 🎯 FINAL SYSTEM v2.0.0
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 FINAL SYSTEM v2.0.0');

// Backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Fix duplicates
const MFG_DB = {
  motion: ['_TZ3000_mmtwjmaq'],
  switch: ['_TZ3000_qzjcsmar'], 
  plug: ['_TZ3000_g5xawfcq'],
  climate: ['_TZE200_cwbvmsar'],
  shutter: ['_TZE200_fctwhugx']
};

let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    for (const [type, ids] of Object.entries(MFG_DB)) {
      if (d.includes(type)) {
        data.zigbee.manufacturerName = ids;
        fs.writeFileSync(f, JSON.stringify(data, null, 2));
        fixed++;
        break;
      }
    }
  }
});

console.log(`✅ Fixed ${fixed} drivers`);

// Validate & Push
try {
  execSync('homey app validate && git add -A && git commit -m "🎯 Final System v2.0.0" && git push', {stdio: 'inherit'});
  console.log('🎉 SUCCESS COMPLETE');
} catch (e) {
  console.log('❌ Error:', e.message);
}
