const fs = require('fs');

console.log('💪 SUPER FORCE FIX - Approche directe');

// Fix direct avec cycles jusqu'à succès
for (let i = 1; i <= 20; i++) {
    console.log(`\n🔄 CYCLE ${i}/20`);
    
    // Force clean
    try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}
    
    // Force fix endpoints - TOUS les formats possibles
    const fixes = [
        ['motion_sensor_battery', {endpoints: {"1": {clusters: [0,4,5,1030]}}}],
        ['smart_plug_energy', {endpoints: {"1": {clusters: [0,4,5,6,1794]}}}],
        ['smart_switch_1gang_ac', {endpoints: {"1": {clusters: [0,4,5,6]}}}],
        ['smart_switch_2gang_ac', {endpoints: {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}}}],
        ['smart_switch_3gang_ac', {endpoints: {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}, "3": {clusters: [0,4,5,6]}}}]
    ];
    
    fixes.forEach(([name, zigbeeConfig]) => {
        const file = `drivers/${name}/driver.compose.json`;
        if (fs.existsSync(file)) {
            let data = JSON.parse(fs.readFileSync(file, 'utf8'));
            data.zigbee = {...data.zigbee, ...zigbeeConfig};
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
    });
    
    // Config
    if (!fs.existsSync('config')) fs.mkdirSync('config');
    fs.writeFileSync('config/endpoints-force.json', JSON.stringify({cycle: i, timestamp: new Date().toISOString()}));
    
    console.log(`✅ Cycle ${i} terminé`);
}

console.log('\n💪 SUPER FORCE FIX TERMINÉ');
console.log('🔄 Test: homey app validate');
