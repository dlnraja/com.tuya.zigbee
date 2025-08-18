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
  const base = await gh('/repos/zigpy/zha-device-handlers/contents/zhaquirks');
  if(!(base.ok && Array.isArray(base.json))){ console.log('[zha] skip'); return; }
  const targets = base.json.filter(x=>x.type==='dir').slice(0,25);
  const items=[];
  for(const d of targets){
    const lst = await gh(`/repos/zigpy/zha-device-handlers/contents/${d.path}`);
    if(!(lst.ok && Array.isArray(lst.json))) continue;
    for(const f of lst.json.filter(x=>/\.py$/i.test(x.name)).slice(0,10)){
      const r = await raw(`/zigpy/zha-device-handlers/master/${f.path}`);
      if(!r.ok) continue;
      const text=r.text;
      const mans=[...text.matchAll(/['"]manufacturer['"]\s*:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
      const models=[...text.matchAll(/['"]model['"]\s*:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
      if(mans.length||models.length) items.push({kind:'zha', ids:models, mans:mans, src:`zhaquirks/${d.name}/${f.name}`});
    }
  }
  if(items.length){ wTodo(items); console.log(`[zha] queued ${items.length} items`); }
})();
