'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..'),DDIR=path.join(ROOT,'drivers');
const OUT=path.join(ROOT,'docs','ARCHITECTURE.md');

function countFP(){
  let t=0,d=0;
  for(const n of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,n,'driver.compose.json');
    if(!fs.existsSync(f))continue;d++;
    try{const c=JSON.parse(fs.readFileSync(f,'utf8'));t+=Math.max(c.zigbee?.manufacturerName?.length||0,c.zigbee?.productId?.length||0)}catch{}
  }
  return{drivers:d,total:t};
}

const s=countFP();
let doc=fs.readFileSync(OUT,'utf8');
doc=doc.replace(/\d+\+? drivers/g,s.drivers+'+ drivers');
doc=doc.replace(/\d+\+? fingerprints/g,s.total+'+ fingerprints');
doc=doc.replace(/> \*\*App\*\*:.*/, '> **App**: `com.dlnraja.tuya.zigbee` | **SDK**: Homey SDK3 | **Entry**: `app.js`\n> **'+s.drivers+'+ drivers** | **'+s.total+'+ fingerprints** | Zigbee + WiFi');
fs.writeFileSync(OUT,doc);
console.log('Updated ARCHITECTURE.md:',s.drivers,'drivers,',s.total,'fingerprints');
