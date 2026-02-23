'use strict';
const fs=require('fs'),path=require('path');
module.exports=function(DDIR){
  const out=[];
  if(!fs.existsSync(DDIR))return out;
  for(const d of fs.readdirSync(DDIR)){
    const cf=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{
      const r=JSON.parse(fs.readFileSync(cf,'utf8'));
      const zb=r.zigbee||{};
      let proto='ZCL';
      const df=path.join(DDIR,d,'device.js');
      if(fs.existsSync(df)){const c=fs.readFileSync(df,'utf8');if(c.includes('EF00')||c.includes('61184'))proto='EF00';}
      out.push({id:d,name:r.name?.en||d,class:r.class||'other',mfrs:zb.manufacturerName||[],pids:zb.productId||[],caps:r.capabilities||[],proto,fpCount:(zb.manufacturerName||[]).length});
    }catch{}
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name));
};
