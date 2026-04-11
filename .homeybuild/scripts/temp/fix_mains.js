const fs = require('fs');
const glob = require('glob');
const files = glob.sync('drivers/*/device.js');
let fixed = 0;
for (const f of files) {
  let txt = fs.readFileSync(f, 'utf8');
  if (txt.includes('mainsPowered')) {
    const isMains = !!txt.match(/get\s+mainsPowered\(\)\s*\{\s*return\s+(true|false)/);
    if (isMains) {
       const m = txt.match(/get\s+mainsPowered\(\)\s*\{\s*return\s+(true|false)/);
       if (m[1] === 'true') {
         const dir = f.split('/')[1];
         const compFile = 'drivers/' + dir + '/driver.compose.json';
         if (fs.existsSync(compFile)) {
           try {
             const cj = JSON.parse(fs.readFileSync(compFile, 'utf8'));
             if (cj.capabilities && cj.capabilities.includes('measure_battery')) {
                if (!txt.includes('removeCapability(''measure_battery'')') && !txt.includes('removeCapability("measure_battery")') && !txt.includes('removeCapability(\measure_battery\)')) {
                   if(txt.includes('onNodeInit({ zclNode }) {')) {
                      txt = txt.replace(/async\s+onNodeInit\(\{\s*zclNode\s*\}\)\s*\{/, "async onNodeInit({ zclNode }) {\n    await this.removeCapability('measure_battery').catch(() => {});");
                   } else if(txt.includes('onNodeInit() {')) {
                      txt = txt.replace(/async\s+onNodeInit\(\s*\)\s*\{/, "async onNodeInit() {\n    await this.removeCapability('measure_battery').catch(() => {});");
                   }
                   fs.writeFileSync(f, txt);
                   fixed++;
                   console.log('Fixed ' + f);
                }
             }
           } catch(e) {}
         }
       }
    }
  }
}
console.log('Fixed ' + fixed + ' files.');
