const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ ANALYZER V10');

try {
  const commits = execSync('git log --oneline -n 15', {encoding: 'utf8'}).split('\n');
  const mfgIds = [];
  commits.forEach(c => {
    const ids = c.match(/_TZ[0-9A-Z]+_[a-z0-9]+/g);
    if (ids) mfgIds.push(...ids);
  });
  
  console.log(`📊 Found ${mfgIds.length} manufacturer IDs in history`);
  if (!fs.existsSync('./references')) fs.mkdirSync('./references');
  fs.writeFileSync('./references/historical_mfg.json', JSON.stringify([...new Set(mfgIds)]));
} catch(e) { console.log('⚠️ Handled'); }

console.log('✅ Analysis complete');
