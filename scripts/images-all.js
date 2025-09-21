const fs = require('fs');

console.log('🎨 IMAGES POUR TOUS DRIVERS');

const drivers = fs.readdirSync('drivers').slice(0, 20);

drivers.forEach(d => {
  const dir = `drivers/${d}/assets`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  
  const svg = '<svg width="75" height="75"><rect fill="#4CAF50" width="75" height="75" rx="8"/></svg>';
  fs.writeFileSync(`${dir}/icon.svg`, svg);
});

console.log(`✅ ${drivers.length} drivers avec images`);
