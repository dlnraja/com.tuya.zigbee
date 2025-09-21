const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 FIX ADAPTATIF');

let iter = 0;
while (iter < 10) {
    iter++;
    console.log(`🔄 CYCLE ${iter}`);
    
    // Fix endpoints
    ['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'].forEach(d => {
        const f = `drivers/${d}/driver.compose.json`;
        if (fs.existsSync(f)) {
            const c = JSON.parse(fs.readFileSync(f, 'utf8'));
            if (!c.zigbee) c.zigbee = {};
            c.zigbee.endpoints = {"1":{"clusters":[0,4,5,6]}};
            fs.writeFileSync(f, JSON.stringify(c, null, 2));
        }
    });
    
    // Clean cache
    try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
    
    // Test validation
    try {
        execSync('homey app validate', {stdio: 'pipe'});
        console.log('✅ VALIDATION RÉUSSIE !');
        break;
    } catch(e) {
        console.log(`⚠️ Erreurs cycle ${iter}`);
    }
}

console.log('🎉 TERMINÉ');
