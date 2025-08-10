'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function migrate(){let c=0;const files=glob.sync('drivers/**/device.js');
for(const f of files){let t=fs.readFileSync(f,'utf8');let m=false;
if(t.includes('homey-meshdriver')){t=t.replace(/homey-meshdriver/g,'homey-zigbeedriver');m=true;}
if(t.includes('onMeshInit')&&!t.includes('onNodeInit')){t=t.replace(/onMeshInit\(\)\s*{/g,'onNodeInit() {\n    // Compatibility wrapper for onMeshInit\n    this.onMeshInit();\n    // Original onMeshInit logic below\n    ');m=true;}
if(m){fs.writeFileSync(f,t);c++;console.log(`[migrate] ${f}`);}}
console.log(`[migrate] ${c} files updated`);}
migrate();
