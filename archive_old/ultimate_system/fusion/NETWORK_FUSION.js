const fs = require('fs');

console.log('🌐 NETWORK FUSION');

const networks = { zigbee: [], zwave: [], wifi: [] };

fs.readdirSync('.').filter(f => f.endsWith('.js')).forEach(script => {
  const content = fs.readFileSync(script, 'utf8');
  if (content.includes('zigbee')) networks.zigbee.push(script);
  else if (content.includes('zwave')) networks.zwave.push(script);
  else if (content.includes('wifi')) networks.wifi.push(script);
});

fs.writeFileSync('./fusion/networks.json', JSON.stringify(networks, null, 2));
console.log('✅ Fusion réseau terminée');
