const fs = require('fs');

fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            // Smart product IDs based on type
            let pids = ["TS0001", "TS011F", "TS0201"];
            if (d.includes('motion')) pids = ["TS0202", "TS0203"];
            if (d.includes('switch')) pids = ["TS0001", "TS0011"];
            if (d.includes('plug')) pids = ["TS011F", "TS0121"];
            
            c.zigbee.productId = pids;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
        }
    }
});

console.log('✅ Product IDs updated');
