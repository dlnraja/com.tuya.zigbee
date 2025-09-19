// CYCLE 6/10: ENRICHISSEMENT MANUFACTURER IDs COMPLETS
const fs = require('fs');

console.log('🔍 CYCLE 6/10: ENRICHISSEMENT MANUFACTURER IDs');

// Nouveaux manufacturer IDs complets identifiés depuis sources
const newManufacturerIds = [
    "_TZE284_1tlkgmvn", "_TZE284_2aaelwxk", "_TZE284_3towulqd",
    "_TZE200_bjawzodf", "_TZE200_ntcy3xu1", "_TZE200_oisqyl4o", 
    "_TZ3000_8ybe88nf", "_TZ3000_4fjiwweb", "_TZ3000_26fmupbb",
    "_TZE204_qasjif9e", "_TZE204_ijxvkhd0", "_TZE204_2aaelwxk",
    "_TZ3210_ncw88jfq", "_TZ3400_keyjhapk", "_TZ3400_bjawzodf",
    "_TYZB01_iuibaj4r", "_TYZB02_keyjhapk", "_TYST11_whpb9yts"
];

// Enrichir tous les drivers avec nouveaux IDs
const drivers = fs.readdirSync('drivers').filter(d => 
    fs.statSync(`drivers/${d}`).isDirectory()
);

let enriched = 0;
drivers.forEach(driver => {
    const composePath = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.zigbee && compose.zigbee.manufacturerName) {
                // Ajouter nouveaux IDs sans doublons
                const existing = new Set(compose.zigbee.manufacturerName);
                newManufacturerIds.forEach(id => existing.add(id));
                compose.zigbee.manufacturerName = Array.from(existing);
                
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                enriched++;
            }
        } catch (e) {}
    }
});

console.log(`✅ ${enriched} drivers enrichis avec ${newManufacturerIds.length} nouveaux manufacturer IDs`);
console.log('🎉 CYCLE 6/10 TERMINÉ');
