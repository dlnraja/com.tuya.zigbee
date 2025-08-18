#!/usr/bin/env node
'use strict';

'use strict';
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=process.cwd(),QUEUE=path.join(ROOT,'queue'); fs.mkdirSync(QUEUE,{recursive:true});
function wTodo(items){const f=path.join(QUEUE,'todo.json');let o={items:[],ts:new Date().toISOString()};try {o=JSON.parse(fs.readFileSync(f,'utf8'));}} catch (error) {}o.items.push(...items);fs.writeFileSync(f,JSON.stringify(o,null,2));}
(async()=>{
  const r = await new Promise((resolve)=>{https.get('https://dresden-elektronik.github.io/deconz-rest-doc/devices/',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({ok:true,text:d}));}).on('error',()=>resolve({ok:false}));});
  if(!(r.ok&&r.text)){ console.log('[deconz] skip'); return; }
  const rows=[...r.text.matchAll(/<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>/g)].map(m=>({vendor:m[1].trim(), label:m[2].trim()})).slice(0,500);
  if(rows.length) wTodo(rows.map(x=>({kind:'deconz', ids:[], mans:[x.vendor], note:x.label, src:'deconz'})));
  console.log(`[deconz] queued ~${rows.length}`);
})();
