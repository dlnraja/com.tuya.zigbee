const fs = require('fs');

console.log('🔍 ENRICHISSEMENT RAPIDE');

// Enrichir avec données historiques
const drivers = ['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'];
const manufacturers = ["BSEED","EweLink","GIRIER","Lonsonho","MOES","Nedis","OWON","_TYST11_","_TZE284_uqfph8ah","_TZE200_pay2byax","_TZ3000_g5xawfcq","Tuya","SmartLife"];

drivers.forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!c.zigbee) c.zigbee = {};
        c.zigbee.manufacturerName = [...new Set([...(c.zigbee.manufacturerName || []), ...manufacturers])];
        c.zigbee.productId = ["TS0011","TS0012","TS0013","TS011F","TS0121","TS0202"];
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
        console.log(`✅ ${d} enrichi`);
    }
});

console.log('🎉 TERMINÉ');
