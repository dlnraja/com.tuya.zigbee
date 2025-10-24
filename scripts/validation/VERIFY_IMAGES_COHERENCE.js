#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Catégories et couleurs attendues
const EXPECTED_CATEGORIES = {
  lighting: { color: '#FFD700', desc: 'Lighting - Yellow/Orange' },
  dimmer: { color: '#FFB74D', desc: 'Dimmers - Orange' },
  led_strip: { color: '#E91E63', desc: 'LED Strips - Pink/Purple' },
  switch: { color: '#4CAF50', desc: 'Switches - Green' },
  button: { color: '#4CAF50', desc: 'Buttons - Green' },
  motion: { color: '#2196F3', desc: 'Motion Sensors - Blue' },
  temperature: { color: '#FF9800', desc: 'Temperature - Orange' },
  humidity: { color: '#00BCD4', desc: 'Humidity - Cyan' },
  air_quality: { color: '#4CAF50', desc: 'Air Quality - Green' },
  plug: { color: '#9C27B0', desc: 'Plugs - Purple' },
  smoke: { color: '#F44336', desc: 'Smoke Detectors - Red' },
  water: { color: '#2196F3', desc: 'Water Leak - Blue' },
  curtain: { color: '#795548', desc: 'Curtains - Brown' },
  lock: { color: '#607D8B', desc: 'Locks - Gray' },
  fan: { color: '#00BCD4', desc: 'Fans - Cyan' }
};

function analyzeDriverName(name) {
  const n = name.toLowerCase();
  if (n.includes('light') || n.includes('bulb')) return 'lighting';
  if (n.includes('dimmer')) return 'dimmer';
  if (n.includes('led_strip') || n.includes('rgb')) return 'led_strip';
  if (n.includes('switch')) return 'switch';
  if (n.includes('button') || n.includes('scene')) return 'button';
  if (n.includes('motion') || n.includes('pir') || n.includes('radar')) return 'motion';
  if (n.includes('temp')) return 'temperature';
  if (n.includes('humid')) return 'humidity';
  if (n.includes('air_quality') || n.includes('co2') || n.includes('voc')) return 'air_quality';
  if (n.includes('plug') || n.includes('socket') || n.includes('energy')) return 'plug';
  if (n.includes('smoke')) return 'smoke';
  if (n.includes('water') || n.includes('leak')) return 'water';
  if (n.includes('curtain') || n.includes('blind')) return 'curtain';
  if (n.includes('lock')) return 'lock';
  if (n.includes('fan')) return 'fan';
  return 'generic';
}

console.log('🔍 VÉRIFICATION COHÉRENCE DES IMAGES\n');
console.log('=' .repeat(70) + '\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory() && !d.startsWith('.');
});

const report = {};
let total = 0;
let withImages = 0;
let categorized = 0;

for (const driver of drivers) {
  const category = analyzeDriverName(driver);
  const assetsDir = path.join(DRIVERS_DIR, driver, 'assets');
  
  const hasSmall = fs.existsSync(path.join(assetsDir, 'small.png'));
  const hasLarge = fs.existsSync(path.join(assetsDir, 'large.png'));
  const hasXLarge = fs.existsSync(path.join(assetsDir, 'xlarge.png'));
  
  total++;
  if (hasSmall && hasLarge && hasXLarge) withImages++;
  if (category !== 'generic') categorized++;
  
  if (!report[category]) {
    report[category] = [];
  }
  
  report[category].push({
    name: driver,
    images: { small: hasSmall, large: hasLarge, xlarge: hasXLarge }
  });
}

// Affichage du rapport
console.log('📊 STATISTIQUES:\n');
console.log(`   Total drivers: ${total}`);
console.log(`   Avec images complètes: ${withImages} (${Math.round(withImages/total*100)}%)`);
console.log(`   Catégorisés: ${categorized} (${Math.round(categorized/total*100)}%)`);
console.log('\n' + '='.repeat(70) + '\n');

console.log('📋 CATÉGORIES ET CORRESPONDANCES:\n');

Object.keys(report).sort().forEach(cat => {
  const expected = EXPECTED_CATEGORIES[cat] || { color: '#607D8B', desc: 'Generic' };
  const drivers = report[cat];
  
  console.log(`\n🎨 ${expected.desc}`);
  console.log(`   Couleur attendue: ${expected.color}`);
  console.log(`   Drivers (${drivers.length}):`);
  
  drivers.forEach(d => {
    const status = d.images.small && d.images.large && d.images.xlarge ? '✅' : '❌';
    console.log(`      ${status} ${d.name}`);
  });
});

console.log('\n' + '='.repeat(70) + '\n');

// Sauvegarder le rapport
const reportPath = path.join(ROOT, 'reports', 'IMAGE_COHERENCE_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats: { total, withImages, categorized },
  categories: report,
  expectedCategories: EXPECTED_CATEGORIES
}, null, 2));

console.log(`✅ Rapport sauvegardé: ${reportPath}\n`);
