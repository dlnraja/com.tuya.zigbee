const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 FIX SCANNER BUG v3.0.0');

// Base de données corrigée pour le scanner
const UNIQUE_MFG = {
  air_quality_monitor: ['_TZ3210_alproto2'],
  motion_sensor_basic: ['_TZ3000_mmtwjmaq'],
  smart_switch_1gang_ac: ['_TZ3000_qzjcsmar'],
  smart_switch_2gang_ac: ['_TZ3000_ji4araar'],
  smart_plug: ['_TZ3000_g5xawfcq'],
  climate_monitor: ['_TZE200_cwbvmsar'],
  contact_sensor: ['_TZ3000_26fmupbb']
};

let fixed = 0;
let scanned = 0;

fs.readdirSync('./drivers').forEach(driver => {
  const composePath = `./drivers/${driver}/driver.compose.json`;
  scanned++;
  
  if (fs.existsSync(composePath) && UNIQUE_MFG[driver]) {
    const data = JSON.parse(fs.readFileSync(composePath));
    data.zigbee = data.zigbee || {};
    data.zigbee.manufacturerName = UNIQUE_MFG[driver];
    fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
    fixed++;
  }
});

console.log(`📊 Scanned ${scanned} drivers, fixed ${fixed}`);

// Valider et publier
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "🔧 Fix scanner bug v3.0.0" && git push', {stdio: 'inherit'});
  console.log('✅ SCANNER FIXED');
} catch (e) {
  console.log('❌ Error:', e.message);
}
