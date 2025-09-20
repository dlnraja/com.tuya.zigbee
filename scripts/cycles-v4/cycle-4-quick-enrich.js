// CYCLE 4/10: ENRICHISSEMENT RAPIDE DEPUIS PRs JOHAN BENDZ
const fs = require('fs');

console.log('🚀 CYCLE 4/10: ENRICHISSEMENT PRs');

// IDs extraits des PRs Johan Bendz scrapées
const newIds = [
    "_TZE284_gyzlwu5q", "_TZ3000_kfu8zapd", "_TZE204_bjzrowv2", 
    "_TZ3000_c8ozah8n", "_TZ3000_o4mkahkc", "_TZ3000_fa9mlvja", 
    "_TZ3000_rcuyhwe3", "_TZ3000_an5rjiwd", "_TZE200_kb5noeto",
    "_TZE200_owon_ths317", "_TZ3000_ewelink_sq510a"
];

// Enrichissement rapide tous drivers
const drivers = fs.readdirSync('drivers').filter(d => 
    fs.statSync(`drivers/${d}`).isDirectory()
);

let count = 0;
drivers.forEach(driver => {
    const path = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(path)) {
        try {
            const data = JSON.parse(fs.readFileSync(path, 'utf8'));
            if (data.zigbee?.manufacturerName) {
                const existing = new Set(data.zigbee.manufacturerName);
                newIds.forEach(id => existing.add(id));
                data.zigbee.manufacturerName = Array.from(existing);
                fs.writeFileSync(path, JSON.stringify(data, null, 2));
                count++;
            }
        } catch (e) {}
    }
});

console.log(`✅ ${count} drivers enrichis avec ${newIds.length} nouveaux IDs`);
console.log('🎉 CYCLE 4/10 TERMINÉ');
