const fs = require('fs');
let txt = fs.readFileSync('drivers/generic_diy/driver.compose.json', 'utf8');
txt = txt.replace(/\s*"dlnraja",/, "");
fs.writeFileSync('drivers/generic_diy/driver.compose.json', txt);
