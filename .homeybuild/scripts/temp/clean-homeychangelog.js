const fs = require('fs');
const file = '.homeychangelog.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// We want to clean up `.homeychangelog.json` so it doesn't mention internal CI/CD, batch scripts, etc.
// And only talks about devices and drivers.

for (const version in data) {
  if (data[version].en) {
    let text = data[version].en;
    
    // Replace internal robot/CI text
    if (text.includes('No changes in CI/CD processes.')) {
      text = text.replace(/, No changes in CI\/CD processes\./g, '');
    }
    if (text.includes('Implemented batch close/respond state update')) {
      text = `v${version}: Added new Tuya device support and overall driver stability improvements.`;
    }
    if (text.includes('No new features added in this release., No improvements made in this release.')) {
       text = text.replace(/, No new features added in this release\., No improvements made in this release\./g, '');
    }
    
    // General cleanup
    text = text.trim();
    if (text.endsWith(',')) text = text.slice(0, -1);
    
    data[version].en = text;
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('✅ Cleaned up .homeychangelog.json');
