#!/usr/bin/env node
'use strict';
const fs=require('fs'),p=require('path');
const D=p.join(__dirname,'..','drivers');
const MFR_ADDS={
  radiator_valve:[
    '_TYST11_jeaxp72v','_TYST11_kfvq6avy','_TYST11_zivfvd7h',
    '_TYST11_hhrtiq0x','_TYST11_ps5v5jor','_TYST11_owwdxjbx',
    '_TYST11_8daqwrsj','_TYST11_czk78ptr','_TYST11_ckud7u2l',
    '_TYST11_ywdxldoj','_TYST11_cwnjrr72','_TYST11_2atgpdho'
  ],
  curtain_motor:['_TYST11_wmcdj3aq'],
  siren:['_TYST11_d0yu2xgi']
};
let tot=0;
for(const[drv,mfrs] of Object.entries(MFR_ADDS)){
  const f=p.join(D,drv,'driver.compose.json');
  if(!fs.existsSync(f)){console.log('SKIP '+drv);continue}
  const j=JSON.parse(fs.readFileSync(f,'utf8'));
  if(!j.zigbee){console.log('SKIP '+drv+' (no zigbee)');continue}
  const ex=new Set((j.zigbee.manufacturerName||[]).map(x=>x.toLowerCase()));
  let n=0;
  for(const m of mfrs){
    if(!ex.has(m.toLowerCase())){j.zigbee.manufacturerName.push(m);n++}
  }
  if(n){fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');console.log(drv+': +'+n);tot+=n}
  else console.log(drv+': up to date');
}
console.log('Total ZHA: +'+tot+' fingerprints');
