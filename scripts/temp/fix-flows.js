const fs = require('fs');

// Fix switch_3gang
let drv3 = fs.readFileSync('drivers/switch_3gang/driver.js', 'utf8');
drv3 = drv3.replace(/const cap = idx === 0 \? 'onoff' : \onoff\.\\$\{idx \+ 1\};\}/g, 'const cap = idx === 0 ? \'onoff\' : \onoff.gang\$\{idx + 1\}\;');
fs.writeFileSync('drivers/switch_3gang/driver.js', drv3);
console.log('Fixed switch_3gang Flow capabilities');

// Fix switch_2gang
let drv2 = fs.readFileSync('drivers/switch_2gang/driver.js', 'utf8');
drv2 = drv2.replace(/const cap = idx === 0 \? 'onoff' : \onoff\.\\$\{idx \+ 1\};\}/g, 'const cap = idx === 0 ? \'onoff\' : \onoff.gang\$\{idx + 1\}\;');
fs.writeFileSync('drivers/switch_2gang/driver.js', drv2);
console.log('Fixed switch_2gang Flow capabilities');
