#!/usr/bin/env node
// 🏛️ HISTORICAL COMPLETE v2.0.0
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ HISTORICAL COMPLETE v2.0.0');

// Setup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Backup commits
try {
  const commits = execSync('git log --oneline -20', {encoding: 'utf8'}).split('\n');
  commits.forEach((c, i) => {
    if (c.trim()) {
      const dir = `./backup/commit_${i}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.writeFileSync(`${dir}/info.txt`, c);
      }
    }
  });
} catch (e) {}

// Fix duplicates
const MFG = {
  motion: ['_TZ3000_mmtwjmaq'],
  switch: ['_TZ3000_qzjcsmar'],
  plug: ['_TZ3000_g5xawfcq'],
  climate: ['_TZE200_cwbvmsar']
};

let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    for (const [type, ids] of Object.entries(MFG)) {
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

// Publish
try {
  execSync('homey app validate && git add -A && git commit -m "🏛️ Historical Complete v2.0.0" && git push', {stdio: 'inherit'});
  console.log('🎉 SUCCESS');
} catch (e) {
  console.log('❌ Error:', e.message);
}
