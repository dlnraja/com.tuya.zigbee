#!/usr/bin/env node
'use strict';

'use strict';
function keys(o){try{return Object.keys(o||{})}catch{return[]}}
async function readBasic(device){const z=device.zclNode;if(!z||!z.endpoints)return;
 for(const epId of Object.keys(z.endpoints)){const ep=z.endpoints[epId],basic=ep&&ep.clusters&&(ep.clusters.basic||ep.clusters['genBasic']);
  if(!basic||typeof basic.readAttributes!=='function')continue;
  try{const a=await basic.readAttributes('manufacturerName','modelId','zclVersion','powerSource');
      device.log('📦 [ZB] Basic', {epId,...a});return;}catch(e){device.log('⚠️ Basic.read',String(e));}}}
function dump(device){const z=device.zclNode;if(!z||!z.endpoints){device.log('ℹ️ no endpoints');return;}
 const eps=Object.keys(z.endpoints);device.log('🔎 endpoints:',eps.join(', '));
 for(const epId of eps){const ep=z.endpoints[epId],cs=keys(ep&&ep.clusters);device.log(`— EP ${epId}:`,cs.join(', '));
  for(const n of cs){const c=ep.clusters[n];device.log(`   • ${n}: attrs[${keys(c&&c.attributes).join(',')||'-'}], cmds[${keys(c&&c.commands).join(',')||'-'}]`);}}}
function subAll(device){const z=device.zclNode;if(!z||!z.endpoints)return;
 for(const epId of Object.keys(z.endpoints)){const ep=z.endpoints[epId],cs=keys(ep&&ep.clusters);
  for(const n of cs){const c=ep.clusters[n];if(!c||typeof c.on!=='function')continue;
   for(const a of keys(c.attributes)){try{c.on(`attr.${a}`,(v,m)=>device.log(`📥 ${n}.${a} (ep:${epId}) ->`,v,m||''));}catch{}}
   for(const cmd of keys(c.commands)){try{c.on(`cmd.${cmd}`,(p,m)=>device.log(`🛰️ ${n}.${cmd} (ep:${epId}) ->`,p,m||''));}catch{}}}}}
function hookCaps(device){const _set=device.setCapabilityValue?.bind(device);
 if(_set){device.setCapabilityValue=async(c,v)=>{device.log(`⬆️ setCapabilityValue(${c}) =>`,v);return _set(c,v);};}
 const _reg=device.registerCapabilityListener?.bind(device);
 if(_reg){device.registerCapabilityListener=(c,fn,opt)=>{device.log(`🧩 registerCapabilityListener(${c})`);
  return _reg(c,async(v,o)=>{device.log(`⬇️ ${c} <-`,v,o||'');try{const r=await fn(v,o);device.log(`✅ ${c} ok`);return r;}
  catch(e){device.error(`❌ ${c} fail`,e);throw e;}},opt);};}}
module.exports=function attachZBVerbose(device,{dumpOnInit=true,readBasicAttrs=true,subscribeReports=true,hookCapabilities=true}={}){
 try{device.log('🔊 verbose Zigbee on'); if(dumpOnInit)dump(device); if(readBasicAttrs)readBasic(device);
     if(subscribeReports)subAll(device); if(hookCapabilities)hookCaps(device);}catch(e){device.error('❌ attachZBVerbose',e);}};
