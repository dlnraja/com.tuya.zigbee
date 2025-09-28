const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ HISTORICAL ANALYZER V16');

const data = {
  commits: 0,
  sources: [],
  manufacturers: new Set()
};

try {
  const commits = execSync('git log --oneline -20', {encoding: 'utf8'}).split('\n');
  data.commits = commits.length;
  
  commits.forEach(c => {
    const ids = c.match(/_TZ[0-9A-Z_]+|TS[0-9A-Z]+/g) || [];
    ids.forEach(id => data.manufacturers.add(id));
    if (c.includes('v') || c.includes('TZ')) data.sources.push(c.slice(0, 30));
  });
  
} catch(e) {}

fs.writeFileSync('./references/historical_v16.json', JSON.stringify({
  ...data,
  manufacturers: Array.from(data.manufacturers)
}, null, 2));

console.log(`✅ Analysé: ${data.commits} commits, ${data.manufacturers.size} IDs`);
