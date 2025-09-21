const fs = require('fs');

console.log('🔧 FIX ENDPOINTS');

const rules = {
    motion: {"1": {clusters: [0,4,5,1030]}},
    plug: {"1": {clusters: [0,4,5,6,1794]}},
    '1gang': {"1": {clusters: [0,4,5,6]}},
    '2gang': {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}},
    '3gang': {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}, "3": {clusters: [0,4,5,6]}},
    default: {"1": {clusters: [0,4,5,6]}}
};

fs.readdirSync('drivers').forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!c.zigbee) c.zigbee = {};
        
        if (d.includes('motion')) c.zigbee.endpoints = rules.motion;
        else if (d.includes('plug')) c.zigbee.endpoints = rules.plug;
        else if (d.includes('3gang')) c.zigbee.endpoints = rules['3gang'];
        else if (d.includes('2gang')) c.zigbee.endpoints = rules['2gang'];
        else if (d.includes('1gang')) c.zigbee.endpoints = rules['1gang'];
        else c.zigbee.endpoints = rules.default;
        
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
    }
});

console.log('✅ TERMINÉ');
