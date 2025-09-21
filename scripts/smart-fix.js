const fs = require('fs');

console.log('🧠 SMART FIX');

fs.readdirSync('drivers').forEach(d => {
    const f = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
        let c = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!c.zigbee) c.zigbee = {};
        
        // Smart endpoints
        let e = {"1": {clusters: [0,4,5,6]}};
        
        if (d.includes('motion')) e = {"1": {clusters: [0,4,5,1030]}};
        else if (d.includes('plug')) e = {"1": {clusters: [0,4,5,6,1794]}};
        else if (d.includes('temp')) e = {"1": {clusters: [0,4,5,1026,1029]}};
        else if (d.includes('2gang')) e = {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}};
        else if (d.includes('3gang')) e = {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}, "3": {clusters: [0,4,5,6]}};
        else if (d.includes('4gang')) e = {"1": {clusters: [0,4,5,6]}, "2": {clusters: [0,4,5,6]}, "3": {clusters: [0,4,5,6]}, "4": {clusters: [0,4,5,6]}};
        
        c.zigbee.endpoints = e;
        fs.writeFileSync(f, JSON.stringify(c, null, 2));
    }
});

console.log('✅ SMART FIX TERMINÉ');
