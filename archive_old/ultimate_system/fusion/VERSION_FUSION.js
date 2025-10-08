const fs = require('fs');

console.log('📱 VERSION FUSION');

const versions = { v10_v15: [], v16_v19: [], current: [] };

fs.readdirSync('.').filter(f => f.endsWith('.js')).forEach(script => {
  const content = fs.readFileSync(script, 'utf8');
  if (content.includes('V1') && parseInt(content.match(/V(\d+)/)?.[1]) <= 15) {
    versions.v10_v15.push(script);
  } else if (content.includes('V1') && parseInt(content.match(/V(\d+)/)?.[1]) >= 16) {
    versions.v16_v19.push(script);
  } else {
    versions.current.push(script);
  }
});

fs.writeFileSync('./fusion/versions.json', JSON.stringify(versions, null, 2));
console.log('✅ Fusion versions terminée');
