const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

const injection = "\n" +
"    if (dp === 112) {\n" +
"      this.log('[SOIL]  SOIL FERTILITY DP112 = ' + parsedValue + ' S/cm');\n" +
"      if (this.hasCapability('measure_conductivity')) {\n" +
"        this.setCapabilityValue('measure_conductivity', parseFloat(parsedValue)).catch(()=>{});\n" +
"      }\n" +
"      return;\n" +
"    }\n";

if (!txt.includes('if (dp === 112)')) {
    txt = txt.replace('if (dp === 109) {', injection + '    if (dp === 109) {');
    fs.writeFileSync('drivers/soil_sensor/device.js', txt);
    console.log('Injected DP112 handler');
} else {
    console.log('DP112 handler already present');
}
