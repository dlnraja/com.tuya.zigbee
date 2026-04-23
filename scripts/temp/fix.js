const fs = require('fs');

function fixFile(path) {
    if (!fs.existsSync(path)) return;
    let txt = fs.readFileSync(path, 'utf8');
    
    // We want to replace this exact string:
    // const cap = idx === 0 ? 'onoff' : \onoff.$\{idx + 1}\      ;
    // with this:
    // const cap = idx === 0 ? 'onoff' : \onoff.gang$\{idx + 1}\      ;
    
    txt = txt.split("const cap = idx === 0 ? 'onoff' : \onoff.$\{idx + 1}\;").join("const cap = idx === 0 ? 'onoff' : \onoff.gang$\{idx + 1}\;");
    
    fs.writeFileSync(path, txt);
}

fixFile('drivers/switch_2gang/driver.js');
fixFile('drivers/switch_3gang/driver.js');
fixFile('drivers/switch_4gang/driver.js');
fixFile('drivers/switch_6gang/driver.js');

console.log('Done fixing onoff capabilities mapping in flows');
