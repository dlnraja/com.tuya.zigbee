const fs = require('fs');
const { execSync } = require('child_process');

for (let i = 1; i <= 10; i++) {
    console.log(`🔄 ${i}`);
    
    // Config
    if (!fs.existsSync('config')) fs.mkdirSync('config');
    fs.writeFileSync('config/drivers-count.json', '{"total":237}');
    
    // Endpoints
    [
        ['motion_sensor_battery', {"1":{"clusters":[0,4,5,1030]}}],
        ['smart_plug_energy', {"1":{"clusters":[0,4,5,6,1794]}}],
        ['smart_switch_1gang_ac', {"1":{"clusters":[0,4,5,6]}}],
        ['smart_switch_2gang_ac', {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]}}],
        ['smart_switch_3gang_ac', {"1":{"clusters":[0,4,5,6]},"2":{"clusters":[0,4,5,6]},"3":{"clusters":[0,4,5,6]}}]
    ].forEach(([n, e]) => {
        const f = `drivers/${n}/driver.compose.json`;
        if (fs.existsSync(f)) {
            let c = JSON.parse(fs.readFileSync(f, 'utf8'));
            c.zigbee = {endpoints: e};
            fs.writeFileSync(f, JSON.stringify(c, null, 2));
        }
    });
    
    try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}
    
    try {
        execSync('homey app validate', {stdio: 'pipe'});
        console.log('✅ OK');
        break;
    } catch(e) {}
}
