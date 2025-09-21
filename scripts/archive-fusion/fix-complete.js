const fs = require('fs');

console.log('🚀 FIX COMPLET');

// 1. Fix endpoints
['motion_sensor_battery','smart_plug_energy','smart_switch_1gang_ac','smart_switch_2gang_ac','smart_switch_3gang_ac'].forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        const c = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!c.zigbee) c.zigbee = {};
        c.zigbee.endpoints = d.includes('energy') ? {"1":{"clusters":[0,4,5,6,1794]}} : {"1":{"clusters":[0,4,5,6]}};
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
        console.log(`✅ ${d}`);
    }
});

// 2. Images manquantes
fs.readdirSync('drivers').forEach(d => {
    const assets = `drivers/${d}/assets`;
    if (!fs.existsSync(assets)) fs.mkdirSync(assets, {recursive: true});
    
    ['small.svg','large.svg','xlarge.svg'].forEach(size => {
        const img = `${assets}/${size}`;
        if (!fs.existsSync(img)) {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#4CAF50" rx="15"/>
<circle cx="50" cy="50" r="25" fill="white" opacity="0.9"/>
</svg>`;
            fs.writeFileSync(img, svg);
        }
    });
});

console.log('🎉 COMPLET');
