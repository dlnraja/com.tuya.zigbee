const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 SYSTÈME FINAL');

// Force fix endpoints
['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'].forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        c.zigbee = {endpoints: {"1": {"clusters": [0,4,5,6]}}};
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
        console.log(`✅ ${d} fixed`);
    }
});

// Clean cache
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

console.log('🎉 TERMINÉ');
