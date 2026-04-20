#!/usr/bin/env node
'use strict';
const {fetchWithRetry}=require('./retry-helper');
const URL='https://raw.githubusercontent.com/u236/homed-service-zigbee/master/deploy/data/usr/share/homed-zigbee/tuya.json';
async function scanHOMEd(){
  console.log('== HOMEd ==');
  const devs=[];
  let data;
  try{const r=await fetchWithRetry(URL,{headers:{'User-Agent':'tuya-bot'}},{retries:3,label:'homed'});if(!r.ok)return devs;data=await r.json()}catch{return devs}
  const walk=(o)=>{
    if(!o||typeof o!=='object')return;
    if(Array.isArray(o)){for(const i of o)walk(i);return}
    const m=o.manufacturerName||o.manufacturer;
    const p=o.modelId||o.model;
    if(m&&m.startsWith('_T')){
      const dp=Array.isArray(o.datapoints)?o.datapoints.map(d=>d.id||d).filter(n=>n>0&&n<256):[];
      devs.push({fp:m,pid:p||null,source:'homed',dps:dp});
    }
    for(const v of Object.values(o))walk(v);
  };
  walk(data);
  console.log('  Found',devs.length,'FP entries from HOMEd');
  return devs;
}
module.exports={scanHOMEd};
if(require.main===module)scanHOMEd().then(d=>console.log('Total:',d.length));
