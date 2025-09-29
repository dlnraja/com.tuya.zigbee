const fs = require('fs');

console.log('⚙️ TYPE FUSION');

const types = { drivers: [], scripts: [], tools: [], analyzers: [] };

fs.readdirSync('.').filter(f => f.endsWith('.js')).forEach(script => {
  if (script.includes('DRIVER') || script.includes('driver')) {
    types.drivers.push(script);
  } else if (script.includes('ANALYZER') || script.includes('SCAN')) {
    types.analyzers.push(script);
  } else if (script.includes('TOOL') || script.includes('tool')) {
    types.tools.push(script);
  } else {
    types.scripts.push(script);
  }
});

fs.writeFileSync('./fusion/types.json', JSON.stringify(types, null, 2));
console.log('✅ Fusion types terminée');
