const fs = require('fs');
const path = require('path');

console.log('🚀 INTÉGRATION MASSIVE - TOUS LES IDs GITHUB\n');

// Charger résultats analyse
const analysisPath = path.join(__dirname, '..', 'github-analysis', 'analysis_results.json');
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

const allIDs = analysis.allManufacturerIDs;
console.log(`📊 Total IDs trouvés: ${allIDs.length}\n`);

// Mapping intelligent des IDs vers drivers
const driverMapping = {
    // Motion/PIR/Radar sensors
    'motion_sensor_battery': ['_TZ3000_', '_TZE200_', 'TS0202'],
    'presence_sensor_radar': ['_TZE200_', '_TZE284_', 'TS0601'],
    'radar_motion_sensor_advanced_battery_battery': ['_TZE200_', '_TZE204_'],
    
    // Temperature/Humidity
    'temperature_humidity_sensor': ['_TZE200_', '_TZE284_', 'TS0201', 'TS0601'],
    
    // Switches/Buttons  
    'scene_controller_4button': ['_TZ3000_', 'TS0041', 'TS0044'],
    'smart_switch_1gang': ['_TZ3000_', 'TS0001'],
    'smart_switch_2gang': ['_TZ3000_', 'TS0002'],
    
    // Plugs/Energy
    'smart_plug_ac_ac_energy': ['_TZ3000_', '_TZ3210_', '_TZE200_', '_TZE204_', 'TS011F', 'TS0121'],
    'smart_plug_ac_ac': ['_TZ3000_', 'TS011F'],
    
    // LED/Lights
    'led_strip_controller': ['_TZ3210_', '_TZ3290_', 'TS0505'],
    'smart_bulb': ['_TZ3000_', 'TS0505'],
    
    // Door/Window
    'door_window_sensor': ['_TZ3000_', '_TZE200_', 'TS0203'],
    
    // Curtains/Shutters
    'curtain_motor': ['_TZE200_', '_TZE284_', 'TS130F', 'TS0601'],
    
    // Soil/Climate
    'soil_tester_temp_humid': ['_TZE284_', 'TS0601'],
    
    // Smoke/Security
    'smoke_temp_humid_sensor': ['_TZE284_', 'TS0205'],
    'smoke_detector': ['_TZ3000_', 'TS0205']
};

// Fonction pour trouver driver approprié
function findAppropriateDriver(id) {
    const scores = {};
    
    for (const [driver, patterns] of Object.entries(driverMapping)) {
        scores[driver] = 0;
        
        for (const pattern of patterns) {
            if (id.includes(pattern)) {
                scores[driver] += 10;
            }
        }
    }
    
    // Retourner driver avec le meilleur score
    const bestDriver = Object.keys(scores).reduce((a, b) => 
        scores[a] > scores[b] ? a : b
    );
    
    return scores[bestDriver] > 0 ? bestDriver : null;
}

// Charger drivers existants
const driversDir = path.join(__dirname, '..', 'drivers');
const allDrivers = fs.readdirSync(driversDir).filter(d => {
    const stat = fs.statSync(path.join(driversDir, d));
    return stat.isDirectory();
});

console.log(`📂 Drivers disponibles: ${allDrivers.length}\n`);

// Analyser quels IDs sont déjà présents
const existingIDs = new Set();
const driverContents = {};

allDrivers.forEach(driver => {
    const composePath = path.join(driversDir, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        try {
            const content = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            driverContents[driver] = content;
            
            if (content.zigbee && content.zigbee.manufacturerName) {
                content.zigbee.manufacturerName.forEach(id => existingIDs.add(id));
            }
        } catch (error) {
            console.log(`⚠️  Erreur lecture ${driver}`);
        }
    }
});

console.log(`✅ IDs déjà présents dans projet: ${existingIDs.size}\n`);

// Filtrer IDs nouveaux
const newIDs = allIDs.filter(id => !existingIDs.has(id));
console.log(`🆕 IDs nouveaux à intégrer: ${newIDs.length}\n`);

if (newIDs.length === 0) {
    console.log('✅ Tous les IDs sont déjà intégrés!\n');
    process.exit(0);
}

// Intégrer les nouveaux IDs
const integration = {};
const integrated = [];
const skipped = [];

newIDs.forEach(id => {
    // Ignorer IDs trop génériques (TS0xxx sans underscore)
    if (id.match(/^TS[0-9]{4}[A-Z]?$/) && !id.startsWith('_')) {
        // Ces IDs sont généralement product IDs, pas manufacturer IDs
        skipped.push(id);
        return;
    }
    
    const suggestedDriver = findAppropriateDriver(id);
    
    if (suggestedDriver && driverContents[suggestedDriver]) {
        if (!integration[suggestedDriver]) {
            integration[suggestedDriver] = [];
        }
        integration[suggestedDriver].push(id);
        integrated.push(id);
    } else {
        skipped.push(id);
    }
});

console.log('📊 PLAN D\'INTÉGRATION:\n');
console.log(`IDs à intégrer: ${integrated.length}`);
console.log(`IDs ignorés: ${skipped.length}\n`);

// Appliquer les modifications
let totalAdded = 0;
const modifiedDrivers = [];

for (const [driver, ids] of Object.entries(integration)) {
    const composePath = path.join(driversDir, driver, 'driver.compose.json');
    const content = driverContents[driver];
    
    if (!content.zigbee.manufacturerName) {
        console.log(`⚠️  ${driver}: Pas de manufacturerName array`);
        continue;
    }
    
    // Ajouter les IDs
    const before = content.zigbee.manufacturerName.length;
    content.zigbee.manufacturerName.push(...ids);
    content.zigbee.manufacturerName = [...new Set(content.zigbee.manufacturerName)];
    content.zigbee.manufacturerName.sort();
    const after = content.zigbee.manufacturerName.length;
    const added = after - before;
    
    if (added > 0) {
        // Sauvegarder
        fs.writeFileSync(composePath, JSON.stringify(content, null, 2), 'utf8');
        
        console.log(`✅ ${driver}: +${added} IDs`);
        ids.forEach(id => console.log(`   + ${id}`));
        
        totalAdded += added;
        modifiedDrivers.push(driver);
    }
}

console.log('\n' + '='.repeat(70));
console.log('📊 RÉSUMÉ INTÉGRATION');
console.log('='.repeat(70));
console.log(`Total IDs GitHub trouvés: ${allIDs.length}`);
console.log(`IDs déjà présents: ${existingIDs.size}`);
console.log(`IDs nouveaux: ${newIDs.length}`);
console.log(`IDs intégrés: ${totalAdded}`);
console.log(`IDs ignorés: ${skipped.length}`);
console.log(`Drivers modifiés: ${modifiedDrivers.length}`);

console.log('\n📋 DRIVERS MODIFIÉS:');
modifiedDrivers.forEach(d => console.log(`  - ${d}`));

if (skipped.length > 0) {
    console.log('\n⚠️  IDs IGNORÉS (générique ou pas de driver approprié):');
    skipped.forEach(id => console.log(`  - ${id}`));
}

console.log('\n🎉 INTÉGRATION TERMINÉE!\n');
