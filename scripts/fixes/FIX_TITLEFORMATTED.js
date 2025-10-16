const fs = require('fs');

console.log('🔧 FIX TITLEFORMATTED - Arguments requis\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Fix send_battery_report
const sendBatteryReport = appJson.flow.actions.find(a => a.id === 'send_battery_report');
if (sendBatteryReport) {
  sendBatteryReport.titleFormatted = {
    en: "Send battery status report via [[method]]",
    fr: "Envoyer rapport état batteries via [[method]]"
  };
  console.log('✅ send_battery_report fixed');
}

// Fix battery_maintenance_mode
const batteryMaintenance = appJson.flow.actions.find(a => a.id === 'battery_maintenance_mode');
if (batteryMaintenance) {
  batteryMaintenance.titleFormatted = {
    en: "Set battery maintenance mode to [[mode]]",
    fr: "Définir mode maintenance batterie sur [[mode]]"
  };
  console.log('✅ battery_maintenance_mode fixed');
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log('\n✅ titleFormatted corrigés avec arguments!\n');
