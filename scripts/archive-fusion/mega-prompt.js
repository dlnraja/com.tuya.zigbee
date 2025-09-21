#!/usr/bin/env node
// 🎯 MEGA PROMPT ULTIME - TOUS ÉLÉMENTS ENRICHIS

const fs = require('fs');

console.log('🚀 MEGA PROMPT ULTIME');

for (let i = 1; i <= 10; i++) {
    console.log(`🔄 CYCLE ${i}`);
    
    // Images Johan Bendz
    fs.readdirSync('drivers').forEach(d => {
        const a = `drivers/${d}/assets`;
        if (!fs.existsSync(a)) fs.mkdirSync(a, {recursive: true});
        const color = d.includes('motion') ? '#2196F3' : d.includes('switch') ? '#4CAF50' : '#9C27B0';
        ['small.svg','large.svg','xlarge.svg'].forEach(s => {
            if (!fs.existsSync(`${a}/${s}`)) {
                fs.writeFileSync(`${a}/${s}`, `<svg viewBox="0 0 100 100"><rect fill="${color}" width="100" height="100" rx="15"/></svg>`);
            }
        });
    });
    
    // Fix endpoints
    ['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'].forEach(d => {
        const f = `drivers/${d}/driver.compose.json`;
        if (fs.existsSync(f)) {
            const c = JSON.parse(fs.readFileSync(f, 'utf8'));
            c.zigbee = c.zigbee || {};
            c.zigbee.endpoints = {"1":{"clusters":[0,4,5,6]}};
            fs.writeFileSync(f, JSON.stringify(c, null, 2));
        }
    });
    
    try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
}

console.log('✅ MEGA PROMPT TERMINÉ');
