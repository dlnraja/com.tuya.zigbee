#!/usr/bin/env node
'use strict';

'use strict';
/**
 * Source: blakadder/zigbee (repo GitHub) ou fallback HTML zigbee.blakadder.com
 * - Extrait manufacturer / model (heuristique) et remplit queue/todo.json
 * - Ne crée pas directement des drivers (on laisse enrich + reorg décider)
 */
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=process.cwd(),QUEUE=path.join(ROOT,'queue'); fs.mkdirSync(QUEUE,{recursive:true});

function wTodo(items){
  const f=path.join(QUEUE,'todo.json');
  let o={items:[],ts:new Date().toISOString()};
  try {o=JSON.parse(fs.readFileSync(f,'utf8'));}} catch (error) {}
  o.items.push(...items);
  fs.writeFileSync(f,JSON.stringify(o,null,2));
}

function gh(pathname){
  return new Promise((resolve)=>{
    const t=process.env.GITHUB_TOKEN;
    if(!t)return resolve({ok:false,why:'NO_TOKEN'});
    const opt={
      hostname:'api.github.com',
      path:pathname,
      headers:{
        'User-Agent':'homey-tuya-bot',
        'Authorization':`Bearer ${t}`
      }
    };
    https.get(opt,res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{
        try {resolve({ok:true,json:JSON.parse(d)})}} catch (error) {resolve({ok:false})}
      });
    }).on('error',()=>resolve({ok:false}));
  });
}

function raw(hostPath){
  return new Promise((resolve)=>{
    const t=process.env.GITHUB_TOKEN;
    if(!t)return resolve({ok:false});
    const opt={
      hostname:'raw.githubusercontent.com',
      path:hostPath,
      headers:{
        'User-Agent':'homey-tuya-bot',
        'Authorization':`Bearer ${t}`
      }
    };
    https.get(opt,res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>resolve({ok:true,text:d}));
    }).on('error',()=>resolve({ok:false}));
  });
}

function toArr(v){return Array.isArray(v)?v:(v==null?[]:[v]);}

(async()=>{
  console.log('[blakadder] Starting Blakadder Zigbee DB seeding...');
  const items=[];
  
  // 1) Essai via GitHub (repo blakadder/zigbee)
  console.log('[blakadder] Trying GitHub repo...');
  const lst=await gh('/repos/blakadder/zigbee/contents'); 
  if(lst.ok && Array.isArray(lst.json)){
    console.log(`[blakadder] Found ${lst.json.length} items in repo`);
    // On lit quelques fichiers README/markdown à la racine comme graines
    const markdownFiles = lst.json.filter(x=>/\.md$/i.test(x.name)).slice(0,20);
    console.log(`[blakadder] Processing ${markdownFiles.length} markdown files...`);
    
    for(const f of markdownFiles){
      console.log(`[blakadder] Reading ${f.path}...`);
      const r=await raw(`/blakadder/zigbee/master/${f.path}`);
      if(r.ok){
        const text=r.text;
        const models=[...text.matchAll(/Model(?:\s*ID)?[:\s]*([A-Za-z0-9._-]+)/gi)].map(m=>m[1]);
        const mans=[...text.matchAll(/Manufacturer[:\s]*([A-Za-z0-9 _-]+)/gi)].map(m=>m[1]);
        if(models.length||mans.length) {
          items.push({kind:'blakadder', ids:models, mans:mans, src:'blakadder/zigbee'});
          console.log(`[blakadder] Found ${models.length} models, ${mans.length} manufacturers in ${f.name}`);
        }
      }
    }
  } else {
    console.log('[blakadder] GitHub repo access failed or empty');
  }

  // 2) Fallback page HTML centrale (au cas où le repo n'est pas suffisant)
  console.log('[blakadder] Trying HTML fallback...');
  try {
    const r = await new Promise((resolve)=>{
      https.get('https://zigbee.blakadder.com/zigbee2mqtt.html',res=>{
        let d='';
        res.on('data',c=>d+=c);
        res.on('end',()=>resolve({ok:true,text:d}));
      }).on('error',()=>resolve({ok:false}));
    });
    if(r.ok){
      const models=[...r.text.matchAll(/data-model = "([^"]+)"/g)].map(m=>m[1]);
      const mans=[...r.text.matchAll(/data-manufacturer = "([^"]+)"/g)].map(m=>m[1]);
      if(models.length||mans.length) {
        const limitedModels = models.slice(0,500);
        const limitedMans = mans.slice(0,500);
        items.push({kind:'blakadder-page', ids:limitedModels, mans:limitedMans, src:'zigbee.blakadder.com'});
        console.log(`[blakadder] HTML fallback: found ${limitedModels.length} models, ${limitedMans.length} manufacturers`);
      }
    }
  }catch(e){
    console.log(`[blakadder] HTML fallback failed: ${e.message}`);
  }

  if(items.length){ 
    wTodo(items); 
    console.log(`[blakadder] ✅ Queued ${items.length} items to queue/todo.json`);
  } else {
    console.log('[blakadder] ⚠️ No items found');
  }
})().catch(e=>{console.error('[blakadder] Fatal error:',e);process.exitCode=1;});
