const fs = require('fs');

console.log('✅ CYCLE 7/10: VALIDATION ET TESTS');

// Validation des drivers critiques
const drivers = ['motion_sensor_battery', 'smart_plug_energy', 'smart_switch_3gang_ac'];
let validated = 0;

drivers.forEach(driver => {
  const f = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(f)) {
    try {
      const config = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (config.zigbee && config.zigbee.endpoints) {
        validated++;
      }
    } catch(e) {
      console.log(`⚠️ ${driver}: JSON invalide`);
    }
  }
});

// Validation app.json
let appValid = false;
try {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  if (app.version === '1.0.32' && app.name) {
    appValid = true;
  }
} catch(e) {}

// Rapport validation
const report = {
  timestamp: new Date().toISOString(),
  driversValidated: validated,
  appValid,
  readyForPublication: validated >= 3 && appValid
};

if (!fs.existsSync('project-data/reports')) {
  fs.mkdirSync('project-data/reports', {recursive: true});
}

fs.writeFileSync('project-data/reports/validation-report.json', JSON.stringify(report, null, 2));

console.log(`✅ CYCLE 7 TERMINÉ - ${validated}/3 drivers validés, app: ${appValid ? 'OK' : 'KO'}`);
