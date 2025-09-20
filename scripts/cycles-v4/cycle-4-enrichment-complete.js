// CYCLE 4/10: ENRICHISSEMENT MANUFACTURER IDs COMPLETS
const fs = require('fs');

console.log('🔧 CYCLE 4/10: ENRICHISSEMENT COMPLET');

// IDs complets avec suffixes depuis toutes les sources
const enrichIds = [
    // PRs Johan Bendz extraits
    "_TZE284_gyzlwu5q", "_TZ3000_kfu8zapd", "_TZE204_bjzrowv2", 
    "_TZ3000_c8ozah8n", "_TZ3000_o4mkahkc", "_TZ3000_fa9mlvja", 
    "_TZ3000_rcuyhwe3", "_TZ3000_an5rjiwd", "_TZE200_kb5noeto",
    
    // Nouveaux patterns Zigbee2MQTT
    "_TZE300_", "_TZE400_", "_TZ3500_", "_TZ3600_", 
    "_TYZB02_", "_TYZC01_", "_TYST11_",
    
    // Marques unbranded
    "MOES", "GIRIER", "Lonsonho", "BSEED", "Nedis", "OWON", "EweLink"
];

const drivers = fs.readdirSync('drivers').filter(d => 
    fs.statSync(`drivers/${d}`).isDirectory()
);

let enhanced = 0;
drivers.forEach(driver => {
    const composePath = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (data.zigbee?.manufacturerName) {
                const existing = new Set(data.zigbee.manufacturerName);
                let added = false;
                
                enrichIds.forEach(id => {
                    if (!existing.has(id)) {
                        existing.add(id);
                        added = true;
                    }
                });
                
                if (added) {
                    data.zigbee.manufacturerName = Array.from(existing).sort();
                    fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
                    enhanced++;
                }
            }
        } catch (e) {
            console.log(`❌ ${driver}: ${e.message}`);
        }
    }
});

console.log(`✅ ${enhanced} drivers enrichis avec ${enrichIds.length} IDs`);
console.log('✅ CYCLE 4/10 TERMINÉ');
