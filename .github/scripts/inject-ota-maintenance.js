const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../drivers');
const drivers = fs.readdirSync(dir);

let count = 0;
for (const d of drivers) {
    const p = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    
    let json = JSON.parse(fs.readFileSync(p, 'utf8'));
    
    // Inject maintenance action
    if (!json.maintenanceActions) {
        json.maintenanceActions = [];
    }
    
    const hasOta = json.maintenanceActions.find(m => m.id === 'ota_check');
    if (!hasOta) {
        json.maintenanceActions.push({
            id: "ota_check",
            title: {
                en: "Check Zigbee OTA Update",
                fr: "Vérifier MàJ OTA",
                nl: "Controleer op OTA-updates"
            }
        });
        
        fs.writeFileSync(p, JSON.stringify(json, null, 2));
        count++;
    }
}
console.log(`Injected into ${count} drivers`);
