#!/usr/bin/env node
'use strict';

'use strict';
/**
 * Source: page deCONZ supported devices (HTML)
 * - Récupère rapidement les couples "vendor + label" et pousse en TODO
 * - Sert de piste pour compléter manufacturerName/modelId via d'autres sources
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

(async()=>{
  console.log('[deconz] Starting deCONZ supported devices scan...');
  
  try {
    const r = await new Promise((resolve)=>{
      https.get('https://dresden-elektronik.github.io/deconz-rest-doc/devices/',res=>{
        let d='';
        res.on('data',c=>d+=c);
        res.on('end',()=>resolve({ok:true,text:d}));
      }).on('error',()=>resolve({ok:false}));
    });
    
    if(!(r.ok&&r.text)){
      console.log('[deconz] ⚠️ Failed to fetch deCONZ devices page');
      return;
    }
    
    console.log(`[deconz] Fetched ${r.text.length} bytes from deCONZ page`);
    
    // Extraction des couples vendor/label depuis les tableaux HTML
    const rows=[...r.text.matchAll(/<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>/g)]
      .map(m=>({vendor:m[1].trim(), label:m[2].trim()}))
      .slice(0,500); // Limite pour éviter la surcharge
      
    if(rows.length) {
      const todoItems = rows.map(x=>({kind:'deconz', ids:[], mans:[x.vendor], note:x.label, src:'deconz'}));
      wTodo(todoItems);
      console.log(`[deconz] ✅ Queued ${rows.length} vendor/label pairs to queue/todo.json`);
      
      // Statistiques des vendors trouvés
      const uniqueVendors = [...new Set(rows.map(r => r.vendor))];
      console.log(`[deconz] Found ${uniqueVendors.length} unique vendors`);
      
      // Aperçu des premiers vendors
      const sampleVendors = uniqueVendors.slice(0,10);
      console.log(`[deconz] Sample vendors: ${sampleVendors.join(', ')}`);
    } else {
      console.log('[deconz] ⚠️ No vendor/label pairs found in HTML');
    }
    
  } catch(e) {
    console.log(`[deconz] ❌ Error during deCONZ scan: ${e.message}`);
  }
})().catch(e=>{console.error('[deconz] Fatal error:',e);process.exitCode=1;});
