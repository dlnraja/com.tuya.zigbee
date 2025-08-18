#!/usr/bin/env node
'use strict';

'use strict';
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=process.cwd(),REFS=path.join(ROOT,'refs'),QUEUE=path.join(ROOT,'queue'); 
fs.mkdirSync(REFS,{recursive:true}); 
fs.mkdirSync(QUEUE,{recursive:true});

function w(p,o){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(o,null,2));}

function gh(pathname){
  return new Promise((resolve)=>{
    const token=process.env.GITHUB_TOKEN; 
    if(!token) return resolve({ok:false,reason:'no token'});
    const opt={hostname:'api.github.com',path:pathname,headers:{'User-Agent':'homey-tuya-bot','Authorization':`Bearer ${token}`}}; 
    https.get(opt,res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{
        try {resolve({ok:true,json:JSON.parse(d)})}
        } catch (error) {resolve({ok:false})}
      });
    }).on('error',()=>resolve({ok:false}));
  });
}

function wTodo(items){
  const f=path.join(QUEUE,'todo.json');
  let o={items:[],ts:new Date().toISOString()};
  try {o=JSON.parse(fs.readFileSync(f,'utf8'));}} catch (error) {}
  if(!o.items) o.items = [];
  o.items.push(...(Array.isArray(items)?items:[]));
  fs.writeFileSync(f,JSON.stringify(o,null,2));
}

(async()=>{
  const owner=process.env.GITHUB_OWNER||'johanbenz', repo=process.env.GITHUB_REPO||'com.tuya.zigbee';
  const refs={issues:[],prs:[],forks:[]};
  
  console.log('[sources] fetching GitHub data...');
  const iss=await gh(`/repos/${owner}/${repo}/issues?state=all&per_page=100`); 
  refs.issues = (iss.ok&&Array.isArray(iss.json))?iss.json:[];
  
  const prs=await gh(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`); 
  refs.prs = (prs.ok&&Array.isArray(prs.json))?prs.json:[];
  
  const fks=await gh(`/repos/${owner}/${repo}/forks?per_page=100`); 
  const fkArr=(fks.ok&&Array.isArray(fks.json))?fks.json:[]; 
  refs.forks=fkArr.map(f=>({full_name:f.full_name,default_branch:f.default_branch||'master'}));
  
  w(path.join(REFS,'github.json'),refs);

  console.log('[sources] fetching Z2M supported devices...');
  const z2mUrl='https://www.zigbee2mqtt.io/supported-devices.json';
  const z2mData=await new Promise(resolve=>{
    https.get(z2mUrl,res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{
        try {resolve(JSON.parse(d))}} catch (error) {resolve([])}
      });
    }).on('error',()=>resolve([]));
  });
  w(path.join(REFS,'z2m-supported.json'),z2mData);

  console.log('[sources] generating todo items...');
  const todoItems=[];
  refs.issues.forEach(i=>{
    if(i.title && i.title.toLowerCase().includes('tuya')) {
      todoItems.push({type:'github-issue',id:i.number,title:i.title,url:i.html_url});
    }
  });
  
  if(Array.isArray(z2mData)) {
    z2mData.slice(0,50).forEach(d=>{
      if(d.model && d.vendor && (d.vendor.toLowerCase().includes('tuya') || d.model.toLowerCase().startsWith('ts'))) {
        todoItems.push({type:'z2m-device',vendor:d.vendor,model:d.model,description:d.description});
      }
    });
  }

  wTodo(todoItems);
  console.log(`[sources] wrote ${todoItems.length} items to todo.json`);
  
  console.log('[sources] calling other seed scripts...');
  try { require('./blakadder-seed.js'); } catch(e) { console.log('blakadder-seed skipped:', e.message); }
  try { require('./zha-seed.js'); } catch(e) { console.log('zha-seed skipped:', e.message); }
  try { require('./deconz-scan.js'); } catch(e) { console.log('deconz-scan skipped:', e.message); }
  
  console.log('[sources] orchestrator completed');
})().catch(console.error);