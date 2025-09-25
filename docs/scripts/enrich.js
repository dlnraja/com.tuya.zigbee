const fs = require('fs');
const { execSync } = require('child_process');

const ids = ["_TZE284_aao6qtcs","_TZE284_cjbofhxw","_TZ3000_mmtwjmaq","TS011F","Tuya"];

fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) c.zigbee.manufacturerName = ids;
        fs.writeFileSync(p, JSON.stringify(c, null, 2));
    }
});

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.5.0';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

execSync('git add -A && git commit -m "Complete IDs v2.5.0" && git push origin master');
console.log('Done');
