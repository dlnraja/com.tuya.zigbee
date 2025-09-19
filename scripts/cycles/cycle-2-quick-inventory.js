// CYCLE 2/10: INVENTAIRE DRIVERS RAPIDE
const fs = require('fs');

console.log('📋 CYCLE 2/10: INVENTAIRE DRIVERS');

// Trouver drivers manquants
const drivers = fs.readdirSync('drivers').filter(d => 
    fs.statSync(`drivers/${d}`).isDirectory()
);

const missing = drivers.filter(d => 
    !fs.existsSync(`drivers/${d}/driver.compose.json`) || 
    !fs.existsSync(`drivers/${d}/device.js`)
);

console.log(`📊 Total: ${drivers.length}, Manquants: ${missing.length}`);

// Créer stubs pour drivers manquants
missing.slice(0, 10).forEach(name => {
    const dir = `drivers/${name}`;
    
    // Basic compose
    const compose = {
        name: { en: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        class: "socket",
        capabilities: ["onoff"],
        zigbee: {
            manufacturerName: ["_TZE284_", "_TZE200_", "_TZ3000_"],
            productId: ["TS0001", "TS0002", "TS0003"]
        }
    };
    
    if (!fs.existsSync(`${dir}/driver.compose.json`)) {
        fs.writeFileSync(`${dir}/driver.compose.json`, JSON.stringify(compose, null, 2));
    }
    
    // Basic device
    const device = `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        this.registerCapability('onoff', 'genOnOff');
    }
}
module.exports = Device;`;
    
    if (!fs.existsSync(`${dir}/device.js`)) {
        fs.writeFileSync(`${dir}/device.js`, device);
    }
    
    console.log(`✅ Créé: ${name}`);
});

console.log('🎉 CYCLE 2/10 TERMINÉ');
