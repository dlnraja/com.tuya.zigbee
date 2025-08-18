#!/usr/bin/env node
'use strict';

'use strict';
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=process.cwd(),QUEUE=path.join(ROOT,'queue'); fs.mkdirSync(QUEUE,{recursive:true});
function wTodo(items){const f=path.join(QUEUE,'todo.json');let o={items:[],ts:new Date().toISOString()};try {o=JSON.parse(fs.readFileSync(f,'utf8'));}} catch (error) {}o.items.push(...items);fs.writeFileSync(f,JSON.stringify(o,null,2));}
function gh(pathname){return new Promise((resolve)=>{const t=process.env.GITHUB_TOKEN;if(!t)return resolve({ok:false,why:'NO_TOKEN'});
  const opt={hostname:'api.github.com',path:pathname,headers:{'User-Agent':'homey-tuya-bot','Authorization':`Bearer ${t}`}};https.get(opt,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try {resolve({ok:true,json:JSON.parse(d)})}} catch (error) {resolve({ok:false})});}).on('error',()=>resolve({ok:false}));});}
function raw(hostPath){return new Promise((resolve)=>{const t=process.env.GITHUB_TOKEN;if(!t)return resolve({ok:false});
  const opt={hostname:'raw.githubusercontent.com',path:hostPath,headers:{'User-Agent':'homey-tuya-bot','Authorization':`Bearer ${t}`}};https.get(opt,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({ok:true,text:d}));}).on('error',()=>resolve({ok:false}));});}
(async()=>{
  const items=[];
  const lst=await gh('/repos/blakadder/zigbee/contents'); if(lst.ok && Array.isArray(lst.json)){
    for(const f of lst.json.filter(x=>/\.md$/i.test(x.name)).slice(0,20)){
      const r=await raw(`/blakadder/zigbee/master/${f.path}`);
      if(r.ok){
        const text=r.text;
        const models=[...text.matchAll(/Model(?:\s*ID)?[:\s]*([A-Za-z0-9._-]+)/gi)].map(m=>m[1]);
        const mans=[...text.matchAll(/Manufacturer[:\s]*([A-Za-z0-9 _-]+)/gi)].map(m=>m[1]);
        if(models.length||mans.length) items.push({kind:'blakadder', ids:models, mans:mans, src:'blakadder/zigbee'});
      }
    }
  }
  try {
    const r = await new Promise((resolve)=>{https.get('https://zigbee.blakadder.com/zigbee2mqtt.html',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({ok:true,text:d}));}).on('error',()=>resolve({ok:false}));});
    if(r.ok){
      const models=[...r.text.matchAll(/data-model = "([^"]+)"/g)].map(m=>m[1]);
      const mans=[...r.text.matchAll(/data-manufacturer = "([^"]+)"/g)].map(m=>m[1]);
      if(models.length||mans.length) items.push({kind:'blakadder-page', ids:models.slice(0,500), mans:mans.slice(0,500), src:'zigbee.blakadder.com'});
    }
  }} catch (error) {}
  if(items.length){ wTodo(items); console.log(`[blakadder] queued ${items.length} items`); } else console.log('[blakadder] no items');
})();
