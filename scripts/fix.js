const fs = require('fs');
const { execSync } = require('child_process');

const ids = ["_TZE284_aao6qtcs","_TZE284_cjbofhxw","_TZ3000_mmtwjmaq","TS011F","TS0201","Tuya"];

fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) c.zigbee.manufacturerName = ids;
        fs.writeFileSync(p, JSON.stringify(c, null, 2));
    }
});

execSync('git add -A && git commit -m "Complete IDs" && git push origin master');
console.log('Done');
