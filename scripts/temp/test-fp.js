const fs = require('fs');

const d = fs.readFileSync('drivers/switch_1gang/driver.compose.json', 'utf8');
if (d.includes('_TZ3002_jn2x20tg')) {
    console.log('It is in switch_1gang!');
}

const d4 = fs.readFileSync('drivers/switch_4gang/driver.compose.json', 'utf8');
if (d4.includes('_TZ3002_jn2x20tg')) {
    console.log('It is in switch_4gang!');
}
