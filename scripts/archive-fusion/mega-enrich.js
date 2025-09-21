const fs = require('fs');

console.log('🚀 MEGA ENRICHISSEMENT - Basé sur v1.0.31-v2.1.5');

// Manufacturers des 22 versions historiques
const m = ["BSEED","EweLink","GIRIER","Lonsonho","MOES","Nedis","OWON","_TYST11_","_TZE284_uqfph8ah","_TZE200_pay2byax","_TZ3000_g5xawfcq","Tuya","SmartLife","Alecto","Zemismart","Lidl","Neo","Meross","_TZ3000_wxktbrwl","_TZE200_9ctu7aik","_TZ3000_tscnmps8"];

// ProductIds historiques
const p = ["TS0011","TS0012","TS0013","TS011F","TS0121","TS0202","TS0203","TS0601","TS0301"];

// Enrichir TOUS les drivers
fs.readdirSync('drivers').forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!c.zigbee) c.zigbee = {};
        c.zigbee.manufacturerName = [...new Set([...(c.zigbee.manufacturerName || []), ...m])];
        c.zigbee.productId = [...new Set([...(c.zigbee.productId || []), ...p])];
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
    }
});

console.log('✅ TOUS drivers enrichis avec historique complet');
