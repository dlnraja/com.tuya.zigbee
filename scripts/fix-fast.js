// FIX RAPIDE
const fs = require('fs');

console.log('🚀 FIX RAPIDE');
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

const IDS = ['_TZE284_uqfph8ah', '_TZE200_bjawzodf', 'BSEED', 'MOES'];

fs.readdirSync('drivers').forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        const c = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!c.zigbee) c.zigbee = {};
        if (!c.zigbee.manufacturerName) c.zigbee.manufacturerName = [];
        c.zigbee.manufacturerName.push(...IDS);
        if (!c.zigbee.endpoints) c.zigbee.endpoints = {"1": {"clusters": [0,4,5,6]}};
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
    }
});

console.log('✅ TERMINÉ');
