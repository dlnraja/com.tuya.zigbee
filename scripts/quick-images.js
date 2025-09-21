const fs = require('fs');

console.log('🎨 IMAGES RAPIDES v1.0.32');

// Créer images pour drivers principaux
const drivers = ['motion_sensor_battery', 'smart_switch_3gang_ac', 'smart_plug_energy'];

drivers.forEach(d => {
  const dir = `drivers/${d}/assets`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  
  // SVG simple
  fs.writeFileSync(`${dir}/icon.svg`, '<svg width="75" height="75"><rect fill="#4CAF50" width="75" height="75" rx="8"/></svg>');
  
  // Images directory
  const imgDir = `${dir}/images`;
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);
  
  // Placeholder images
  fs.writeFileSync(`${imgDir}/large.png`, 'PNG_DATA_PLACEHOLDER');
  fs.writeFileSync(`${imgDir}/small.png`, 'PNG_DATA_PLACEHOLDER');
});

console.log('✅ Images créées pour 3 drivers');
