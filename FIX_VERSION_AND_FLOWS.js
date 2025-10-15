const fs = require('fs');

console.log('🔧 Mise à jour version 2.16.0 + Enrichissement flows\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// 1. Version 2.16.0
appJson.version = '2.16.0';
console.log('✅ Version: 2.16.0');

// 2. Ajouter titleFormatted aux flows manquants
let fixed = 0;

if (appJson.flow && appJson.flow.actions) {
  appJson.flow.actions.forEach(action => {
    if (action.id === 'send_battery_report' && !action.titleFormatted) {
      action.titleFormatted = {
        en: "Send battery status report",
        fr: "Envoyer rapport état batteries"
      };
      fixed++;
    }
    
    if (action.id === 'battery_maintenance_mode' && !action.titleFormatted) {
      action.titleFormatted = {
        en: "Enable battery maintenance mode",
        fr: "Activer mode maintenance batterie"
      };
      fixed++;
    }
  });
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log(`✅ ${fixed} flows enrichis avec titleFormatted`);
console.log('\n✅ app.json mis à jour!\n');
