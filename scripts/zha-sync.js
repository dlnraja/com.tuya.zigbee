#!/usr/bin/env node
'use strict';
const https=require('https'),fs=require('fs'),p=require('path');
const BASE='https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/';
const FILES=['ts0601_trv.py','tuya_motion.py','ts0601_switch.py','ts0601_cover.py','ts011f_plug.py','tuya_smoke.py','tuya_gas.py','tuya_siren.py','tuya_valve.py','ts0601_dimmer.py','ts0601_din_power.py','tuya_sensor.py','ts0601_haozee.py'];
function get(u){return new Promise((ok,no)=>{https.get(u,{headers:{'User-Agent':'S'},timeout:30000},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>ok(d));r.on('error',no)}).on('error',no)})}
async function main(){
  const all=[];
  for(const f of FILES){
    try{
      const s=await get(BASE+f);
      // Extract manufacturer names from signature blocks
      const re=/"(_T[A-Z0-9]+_[a-z0-9]+)"/g;
      let m;while((m=re.exec(s))!==null)all.push({mfr:m[1],file:f});
      // Also extract non-underscore manufacturer names
      const re2=/MODELS_INFO.*?\[([\s\S]*?)\]/g;
      while((m=re2.exec(s))!==null){
        const ms=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
        ms.filter(x=>!x.startsWith('_')).forEach(x=>all.push({mfr:x,file:f}));
      }
      console.log(f+': '+all.filter(x=>x.file===f).length+' mfrs');
    }catch(e){console.log('ERR '+f+': '+e.message)}
  }
  const unique=new Map();
  all.forEach(x=>{if(!unique.has(x.mfr))unique.set(x.mfr,x.file)});
  // Cross-ref with existing
  const D=p.join(__dirname,'..','drivers');
  const ex=new Set();
  fs.readdirSync(D).filter(d=>fs.statSync(p.join(D,d)).isDirectory()).forEach(drv=>{
    const f=p.join(D,drv,'driver.compose.json');
    if(!fs.existsSync(f))return;
    try{const j=JSON.parse(fs.readFileSync(f,'utf8'));
    if(j.zigbee)(j.zigbee.manufacturerName||[]).forEach(m=>ex.add(m.toLowerCase()))}catch(e){}
  });
  const missing=[];
  for(const[mfr,file] of unique){
    if(!ex.has(mfr.toLowerCase()))missing.push({mfr,file});
  }
  const o={total:unique.size,existing:unique.size-missing.length,missing:missing.length,details:missing};
  fs.writeFileSync(p.join(__dirname,'zha-data.json'),JSON.stringify(o,null,2));
  console.log('\nZHA: '+unique.size+' unique mfrs, '+missing.length+' missing from Homey');
}
main().catch(e=>{console.error(e);process.exit(1)});
