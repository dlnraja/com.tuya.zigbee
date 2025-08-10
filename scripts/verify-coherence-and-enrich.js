'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function verify(){let c=0,errors=0;const drivers=glob.sync('drivers/**/driver.json');
const report=['# Driver Verification Report',`Generated: ${new Date().toISOString()}`,`Total drivers: ${drivers.length}`,''];
for(const d of drivers){try{const driver=JSON.parse(fs.readFileSync(d,'utf8'));const dir=path.dirname(d);
// Check required fields
if(!driver.id)driver.id=path.basename(dir);
if(!driver.name)driver.name={en:driver.id,fr:driver.id};
if(!driver.capabilities)driver.capabilities=[];
if(!driver.zigbee)driver.zigbee={};
// Enrich manufacturerName and modelId if missing
if(!driver.zigbee.manufacturerName)driver.zigbee.manufacturerName=['tuya'];
if(!driver.zigbee.modelId)driver.zigbee.modelId=[driver.id];
if(JSON.stringify(driver)!==fs.readFileSync(d,'utf8')){fs.writeFileSync(d,JSON.stringify(driver,null,2));c++;}
report.push(`✅ ${driver.id}: ${driver.capabilities.length} capabilities`);
}catch(e){errors++;report.push(`❌ ${d}: ${e.message}`);}}
report.push('',`Updated: ${c}`,`Errors: ${errors}`);
fs.writeFileSync('VERIFY_REPORT.md',report.join('\n'));console.log(`[verify] ${c} drivers updated, ${errors} errors`);}
verify();
