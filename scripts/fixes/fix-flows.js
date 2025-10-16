const fs = require('fs');

console.log('🔧 FIX FLOWS titleFormatted\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Fix send_battery_report
const sendBattery = appJson.flow.actions.find(a => a.id === 'send_battery_report');
if (sendBattery) {
  sendBattery.titleFormatted = {
    en: "Send battery status report via [[method]]",
    fr: "Envoyer rapport état batteries via [[method]]"
  };
  console.log('✅ send_battery_report - titleFormatted avec [[method]]');
}

// Fix battery_maintenance_mode
const battMaint = appJson.flow.actions.find(a => a.id === 'battery_maintenance_mode');
if (battMaint) {
  battMaint.titleFormatted = {
    en: "Enable battery maintenance mode for [[duration]] hours",
    fr: "Activer mode maintenance batterie pour [[duration]] heures"
  };
  console.log('✅ battery_maintenance_mode - titleFormatted avec [[duration]]');
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log('\n✅ Flows corrigés!\n');
