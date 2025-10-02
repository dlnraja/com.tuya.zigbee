const fs = require('fs');

console.log('🚚 DÉPLACEMENT INTELLIGENT MANUFACTURERS');

// Détection type basée sur capabilities/class
function detectType(data) {
  const caps = data.capabilities || [];
  const cls = data.class || '';
  
  if (caps.includes('alarm_motion')) return 'motion_sensor';
  if (caps.includes('onoff') && caps.includes('dim') && cls === 'light') return 'dimmer';
  if (caps.includes('onoff') && cls === 'socket') return 'plug';
  if (caps.includes('measure_temperature')) return 'temperature';
  if (caps.includes('alarm_smoke')) return 'smoke';
  if (caps.includes('alarm_co')) return 'co_detector';
  if (caps.includes('alarm_water')) return 'water_leak';
  if (cls === 'lock') return 'lock';
  if (cls === 'thermostat') return 'thermostat';
  if (cls === 'light') return 'light';
  if (cls === 'socket') return 'switch';
  
  return null;
}

const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());
let moved = 0, analyzed = 0;

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const detected = detectType(data);
    analyzed++;
    
    if (detected && !driver.includes(detected)) {
      // Trouver driver cible
      const target = drivers.find(d => d.startsWith(detected));
      if (target && target !== driver && data.zigbee?.manufacturerName) {
        console.log(`  📦 ${driver} devrait être ${detected} -> ${target}`);
        moved++;
      }
    }
  }
});

console.log(`✅ ${analyzed} drivers analysés, ${moved} à déplacer potentiellement`);
