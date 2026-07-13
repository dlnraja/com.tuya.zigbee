const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.github/state/temporal-cross-reference.json', 'utf8'));

// Find OPEN button issues
const openButton = data.issues.filter(i => i.state === 'OPEN');
console.log('=== OPEN button issues ===');
for (const i of openButton) {
  console.log('#' + i.number + ' (' + (i.age_days || '?') + 'd old) ' + i.title);
}
