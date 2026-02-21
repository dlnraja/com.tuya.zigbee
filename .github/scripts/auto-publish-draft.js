#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const PAT=process.env.HOMEY_PAT,APP='com.dlnraja.tuya.zigbee';
const API='https://api.athom.com',DRY=process.env.DRY_RUN==='true';
if(!PAT){console.error('HOMEY_PAT not set');process.exit(1)}
const H={'Authorization':`Bearer ${PAT}`,'Content-Type':'application/json'};
async function api(m,ep,b){
  const u=`${API}${ep}`,o={method:m,headers:H};
  if(b)o.body=JSON.stringify(b);
  const r=await fetch(u,o),t=await r.text();
  let d;try{d=JSON.parse(t)}catch{d=t}
  return{ok:r.ok,s:r.status,d};
}
async function main(){
  const ver=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version;
  console.log(`App: ${APP} v${ver} DRY=${DRY}`);
  const eps=[['/api/app/'+APP],['/apps-sdk/app/'+APP],['/api/app/'+APP+'/version/'+ver]];
  for(const[ep]of eps){const r=await api('GET',ep);console.log(`GET ${ep} => ${r.s}`,r.ok?'OK':'FAIL');if(r.ok)console.log(JSON.stringify(r.d).slice(0,200))}
  if(DRY){console.log('DRY RUN - skip publish');return}
  const pubEps=[['/api/app/'+APP+'/version/'+ver+'/test','PUT'],['/api/app/'+APP+'/version/'+ver+'/publish','POST'],['/apps-sdk/app/'+APP+'/version/'+ver+'/test','PUT']];
  for(const[ep,m]of pubEps){const r=await api(m,ep);console.log(`${m} ${ep} ${r.s}`,r.ok?'PUBLISHED!':'fail');if(r.ok){console.log('Draft published to test!');return}}
  console.log('Could not auto-publish. Manual action needed at:');
  console.log(`https://tools.developer.homey.app/apps/app/${APP}`);
}
main().catch(e=>{console.error(e);process.exit(1)});
